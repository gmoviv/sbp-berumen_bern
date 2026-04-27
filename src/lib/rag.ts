// src/lib/rag.ts
import { createHash } from 'node:crypto';
import { db, openai, redis } from './clients';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_CACHE_TTL_SECONDS = 3600; // N14 — 1 hour

async function getEmbedding(query: string): Promise<number[]> {
    const key = `embed:${EMBEDDING_MODEL}:${createHash('sha256').update(query).digest('hex')}`;

    if (redis) {
        try {
            const cached = await redis.get<number[]>(key);
            if (Array.isArray(cached) && cached.length > 0) {
                return cached;
            }
        } catch (err) {
            console.warn('[rag] embedding cache read failed', err);
        }
    }

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: query,
    });
    const embedding = response.data[0].embedding;

    if (redis) {
        try {
            await redis.set(key, embedding, { ex: EMBEDDING_CACHE_TTL_SECONDS });
        } catch (err) {
            console.warn('[rag] embedding cache write failed', err);
        }
    }

    return embedding;
}

export interface SearchResult {
    id: string;
    content: string;
    metadata: {
        source_file: string;
        persona_ids: string[];
    };
    score: number;
}

/**
 * Performs a hybrid search (keyword + vector) on the database.
 */
export async function hybridSearch(
    query: string,
    personaId: string,
    topK = 5
): Promise<SearchResult[]> {
    const client = await db.connect(); // Check out a client from the pool

    try {
        // 1. Get embedding for the query (cached per query — N14)
        const queryEmbedding = await getEmbedding(query);

        // 2. Perform keyword search (FTS)
        const keywordQuery = `
            SELECT id, content, metadata, ts_rank(content_tsvector, websearch_to_tsquery('english', $1)) AS score
            FROM documents
            WHERE (metadata->'persona_ids' @> '["*"]' OR metadata->'persona_ids' @> to_jsonb($2::text))
            AND content_tsvector @@ websearch_to_tsquery('english', $1)
            ORDER BY score DESC
            LIMIT $3;
        `;
        const keywordResults = await client.query(keywordQuery, [query, personaId, topK]);

        // 3. Perform vector search (HNSW)
        const vectorQuery = `
            SELECT id, content, metadata, 1 - (embedding <=> $1) AS score
            FROM documents
            WHERE (metadata->'persona_ids' @> '["*"]' OR metadata->'persona_ids' @> to_jsonb($2::text))
            ORDER BY score DESC
            LIMIT $3;
        `;
        const vectorResults = await client.query(vectorQuery, [`[${queryEmbedding.join(',')}]`, personaId, topK]);

        // 4. Combine and re-rank results (Reciprocal Rank Fusion)
        const rankedResults: Record<string, { score: number; result: SearchResult }> = {};

        // C9 — RRF must SUM contributions across rankers, not take MAX.
        // Taking max meant a doc ranked #1 in vector + #1 in keyword scored
        // identically to a doc ranked #1 in only one — fusion provided zero
        // discrimination. Additive score is the canonical Reciprocal Rank
        // Fusion definition.
        const processResults = (results: { id: string; content: string; metadata: SearchResult["metadata"]; score: number }[], k = 60) => {
            results.forEach((row, index) => {
                const rank = index + 1;
                const contribution = 1 / (k + rank);
                const existing = rankedResults[row.id];
                if (existing) {
                    existing.score += contribution;
                } else {
                    rankedResults[row.id] = {
                        score: contribution,
                        result: {
                            id: row.id,
                            content: row.content,
                            metadata: row.metadata,
                            score: row.score, // original score for inspection
                        },
                    };
                }
            });
        };
        
        processResults(keywordResults.rows);
        processResults(vectorResults.rows);

        const finalResults = Object.values(rankedResults)
            .sort((a, b) => b.score - a.score)
            .map(item => item.result)
            .slice(0, topK);

        return finalResults;

    } catch (err) {
        console.error('Error during hybrid search:', err);
        return [];
    } finally {
        client.release(); // Release the client back to the pool
    }
}
