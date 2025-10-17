import express from 'express';
import crypto from 'crypto';
import axios from 'axios';

const router = express.Router();

// Mock OTP service for development
// In production, this would integrate with UIDAI's OTP service
const otpStorage = new Map<string, { otp: string; expiresAt: number; txnId: string }>();

// Send OTP to user's mobile
router.post('/send-otp', async (req, res) => {
  try {
    const { aadhaarNumber, userAddress } = req.body;

    if (!aadhaarNumber || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number and user address are required'
      });
    }

    // Validate Aadhaar number format
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number format'
      });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store OTP with expiration (5 minutes)
    otpStorage.set(aadhaarNumber, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      txnId
    });

    // In production, this would send SMS via UIDAI's OTP service
    console.log(`📱 OTP for Aadhaar ${aadhaarNumber}: ${otp} (TXN: ${txnId})`);

    res.json({
      success: true,
      message: 'OTP sent successfully to your registered mobile number',
      txnId
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { aadhaarNumber, otp, txnId, userAddress } = req.body;

    if (!aadhaarNumber || !otp || !txnId || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Get stored OTP data
    const storedData = otpStorage.get(aadhaarNumber);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }

    // Check if OTP has expired
    if (Date.now() > storedData.expiresAt) {
      otpStorage.delete(aadhaarNumber);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Verify OTP
    if (otp !== storedData.otp || txnId !== storedData.txnId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // OTP verified successfully
    otpStorage.delete(aadhaarNumber);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Download Aadhaar XML
router.post('/download-xml', async (req, res) => {
  try {
    const { aadhaarNumber, shareCode, userAddress } = req.body;

    if (!aadhaarNumber || !shareCode || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number, share code, and user address are required'
      });
    }

    // Validate inputs
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number format'
      });
    }

    if (shareCode.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Share code must be at least 6 characters long'
      });
    }

    // In production, this would integrate with UIDAI's e-Aadhaar service
    // For now, we'll generate a mock XML structure
    const mockXmlData = generateMockAadhaarXML(aadhaarNumber, shareCode);

    res.json({
      success: true,
      message: 'Aadhaar XML downloaded successfully',
      xmlData: mockXmlData
    });

  } catch (error) {
    console.error('Error downloading Aadhaar XML:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download Aadhaar XML'
    });
  }
});

// Generate mock Aadhaar XML for development
function generateMockAadhaarXML(aadhaarNumber: string, shareCode: string): string {
  const timestamp = new Date().toISOString();
  const signature = crypto.createHash('sha256')
    .update(aadhaarNumber + shareCode + timestamp)
    .digest('hex');

  // Mock XML structure that would be similar to UIDAI's e-Aadhaar XML
  const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<PrintLetterBarcodeData>
  <uid>${aadhaarNumber}</uid>
  <name>Test User</name>
  <gender>M</gender>
  <yob>1990</yob>
  <co>S/O Test Father</co>
  <house>123 Test House</house>
  <street>Test Street</street>
  <lm>Test Locality</lm>
  <vtc>Test Village</vtc>
  <po>Test Post Office</po>
  <dist>Test District</dist>
  <state>Test State</state>
  <pc>123456</pc>
  <dob>01/01/1990</dob>
  <timestamp>${timestamp}</timestamp>
  <signature>${signature}</signature>
</PrintLetterBarcodeData>`;

  return xmlData;
}

// Verify Aadhaar XML signature
router.post('/verify-xml-signature', async (req, res) => {
  try {
    const { xmlData, aadhaarNumber } = req.body;

    if (!xmlData || !aadhaarNumber) {
      return res.status(400).json({
        success: false,
        message: 'XML data and Aadhaar number are required'
      });
    }

    // In production, this would verify the UIDAI digital signature
    // For now, we'll do basic validation
    const isValid = validateAadhaarXML(xmlData, aadhaarNumber);

    res.json({
      success: isValid,
      message: isValid ? 'XML signature verified' : 'Invalid XML signature'
    });

  } catch (error) {
    console.error('Error verifying XML signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify XML signature'
    });
  }
});

// Validate Aadhaar XML structure
function validateAadhaarXML(xmlData: string, aadhaarNumber: string): boolean {
  try {
    // Basic XML validation
    if (!xmlData.includes('<PrintLetterBarcodeData>') || !xmlData.includes('</PrintLetterBarcodeData>')) {
      return false;
    }

    // Check if Aadhaar number matches
    if (!xmlData.includes(`<uid>${aadhaarNumber}</uid>`)) {
      return false;
    }

    // In production, this would verify the UIDAI digital signature
    // For now, we'll return true for valid XML structure
    return true;
  } catch (error) {
    console.error('Error validating XML:', error);
    return false;
  }
}

// Get Aadhaar verification status
router.get('/verification-status/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: 'User address is required'
      });
    }

    // In production, this would check the blockchain for verification status
    // For now, we'll return a mock status
    res.json({
      success: true,
      data: {
        isVerified: false,
        verificationDate: null,
        aadhaarHash: null
      }
    });

  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status'
    });
  }
});

export default router;
