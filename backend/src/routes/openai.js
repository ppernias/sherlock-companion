const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Image prompt prefix for consistent Victorian miniature style
const IMAGE_PROMPT_PREFIX = 'Realistic painted resin miniature, Victorian style, white background, high detail sculpt, tabletop gaming miniature, 50-60mm scale, ';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate or improve prompt from description
router.post('/generate-prompt', verifyToken, requireAdmin, async (req, res) => {
  const { descripcion, currentPrompt } = req.body;

  if (!descripcion) {
    return res.status(400).json({ error: 'La descripcion es requerida' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key no configurada' });
  }

  if (!process.env.OPENAI_METAPROMPT) {
    return res.status(500).json({ error: 'Metaprompt no configurado' });
  }

  try {
    // Combine metaprompt with description
    let userContent = descripcion;

    // If there's an existing prompt, include it for improvement
    if (currentPrompt) {
      userContent = `Descripcion: ${descripcion}\n\nPrompt actual a mejorar: ${currentPrompt}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: process.env.OPENAI_METAPROMPT,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const generatedPrompt = completion.choices[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      return res.status(500).json({ error: 'No se pudo generar el prompt' });
    }

    res.json({
      prompt: generatedPrompt,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);

    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ error: 'Cuota de OpenAI agotada' });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ error: 'API key de OpenAI invalida' });
    }

    res.status(500).json({ error: 'Error al comunicarse con OpenAI' });
  }
});

// Generate image with GPT-Image-1
router.post('/generate-image', verifyToken, requireAdmin, async (req, res) => {
  const { prompt, quality = 'medium' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'El prompt es requerido' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key no configurada' });
  }

  try {
    // Combine prefix with user prompt
    const fullPrompt = IMAGE_PROMPT_PREFIX + prompt;

    console.log('Generating image with GPT-Image-1.5...');
    console.log('Quality:', quality);
    console.log('Prompt:', fullPrompt.substring(0, 200) + '...');

    const response = await openai.images.generate({
      model: 'gpt-image-1.5',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      quality: quality, // low, medium, high
    });

    const base64Image = response.data[0]?.b64_json;

    if (!base64Image) {
      return res.status(500).json({ error: 'No se pudo generar la imagen' });
    }

    // Save base64 image to file
    const filename = `gptimg-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const filepath = path.join(__dirname, '..', 'uploads', 'images', filename);

    // Decode base64 and write to file
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(filepath, imageBuffer);

    console.log('Image saved:', filename);

    res.json({
      filename,
      originalPrompt: fullPrompt,
    });
  } catch (error) {
    console.error('GPT-Image API error:', error);

    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ error: 'Cuota de OpenAI agotada' });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ error: 'API key de OpenAI invalida' });
    }

    if (error.code === 'content_policy_violation') {
      return res.status(400).json({ error: 'El prompt viola las politicas de contenido de OpenAI' });
    }

    res.status(500).json({ error: error.message || 'Error al generar imagen con GPT-Image' });
  }
});

module.exports = router;
