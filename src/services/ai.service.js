const openai = require('../config/openai');

const summarizeDocument = async (content) => {
  const plainText = content.replace(/<[^>]*>/g, '').trim();

  if (!plainText || plainText.length < 20) {
    throw new Error('Document content is too short to summarize');
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Summarize the following document content concisely in 3-5 bullet points. Return only the bullet points.',
      },
      {
        role: 'user',
        content: plainText,
      },
    ],
    max_tokens: 400,
    temperature: 0.5,
  });

  return completion.choices[0].message.content;
};

const improveWriting = async (content) => {
  const plainText = content.replace(/<[^>]*>/g, '').trim();

  if (!plainText || plainText.length < 10) {
    throw new Error('Content is too short to improve');
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional editor. Improve the clarity, grammar, and flow of the following text. Return only the improved text, maintaining the same general meaning and length.',
      },
      {
        role: 'user',
        content: plainText,
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
};

const generateTasks = async (content) => {
  const plainText = content.replace(/<[^>]*>/g, '').trim();

  if (!plainText || plainText.length < 20) {
    throw new Error('Content is too short to generate tasks');
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a project manager assistant. Extract actionable tasks from the following notes. Return a numbered list of clear, specific tasks only. Each task should start with a verb.',
      },
      {
        role: 'user',
        content: plainText,
      },
    ],
    max_tokens: 500,
    temperature: 0.6,
  });

  return completion.choices[0].message.content;
};

module.exports = { summarizeDocument, improveWriting, generateTasks };