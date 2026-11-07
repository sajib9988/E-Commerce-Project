CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_knowledge_chunks (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ai_knowledge_chunks_source_idx
ON ai_knowledge_chunks(source);
