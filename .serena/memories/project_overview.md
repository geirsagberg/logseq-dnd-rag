# Project Overview

## Purpose
RAG (Retrieval-Augmented Generation) system for querying D&D campaign notes stored in Logseq. 
- Indexes markdown files into a vector database (Qdrant)
- Uses Claude to answer questions based on retrieved context

## Tech Stack
- **Runtime**: Bun
- **Language**: TypeScript
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Vector DB**: Qdrant (running in Docker)
- **LLM**: Claude Haiku 4.5
- **Source Format**: Logseq markdown files
- **Additional Libraries**: LangChain (@langchain/openai, @langchain/community), Zod (validation), gray-matter, markdown-it

## System
Darwin (macOS)
