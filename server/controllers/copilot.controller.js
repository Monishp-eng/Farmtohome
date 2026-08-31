const llmService = require('../services/llm.service');

const chat = async (req, res) => {
  try {
    const { message, history, userRole, language } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const response = await llmService.chatWithCopilot({
      message,
      history: history || [],
      userRole: userRole || req.user?.role || 'consumer',
      language: language || 'en'
    });

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('[Copilot Controller Error]', error);
    res.status(500).json({ success: false, message: 'AI Copilot error', error: error.message });
  }
};

const diagnose = async (req, res) => {
  try {
    const { cropName, symptoms, language, soilType, region } = req.body;
    if (!symptoms || !symptoms.trim()) {
      return res.status(400).json({ success: false, message: 'Symptoms description is required' });
    }

    const diagnosis = await llmService.diagnoseCropIssue({
      cropName: cropName || 'General Crop',
      symptoms,
      language: language || 'en',
      soilType: soilType || 'Loamy',
      region: region || 'India'
    });

    res.json({ success: true, data: diagnosis });
  } catch (error) {
    console.error('[Doctor Controller Error]', error);
    res.status(500).json({ success: false, message: 'Diagnosis error', error: error.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { geminiKey, grokKey, openaiKey, provider } = req.body;
    llmService.updateApiKeys({ geminiKey, grokKey, openaiKey, provider });
    const status = llmService.getProviderStatus();

    res.json({
      success: true,
      message: 'LLM Configuration updated successfully',
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Config update failed', error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const status = llmService.getProviderStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Status error', error: error.message });
  }
};

module.exports = {
  chat,
  diagnose,
  updateConfig,
  getStatus
};
