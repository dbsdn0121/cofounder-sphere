import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Embedding 생성 함수
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error('Failed to create embedding');
  }
}

// 재시도 로직이 포함된 embedding 함수
export async function createEmbeddingWithRetry(
  text: string, 
  maxRetries: number = 3
): Promise<number[]> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await createEmbedding(text);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 지수백오프 (1초, 2초, 4초)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  
  throw new Error('Max retries exceeded');
}