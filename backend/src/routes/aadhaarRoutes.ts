import express from 'express';
import crypto from 'crypto';
import axios from 'axios';

const router = express.Router();

// Mock OTP service for development
// In production, this would integrate with UIDAI's OTP service
const otpStorage = new Map<string, { otp: string; expiresAt: number; txnId: string }>();

// Dummy Aadhaar data for testing
interface DummyAadhaarData {
  name: string;
  mobile: string;
  email: string;
  address: string;
  dob: string;
  gender: string;
  otp: string;
}

const DUMMY_AADHAAR_DATA: Record<string, DummyAadhaarData> = {
  '123456789012': {
    name: 'John Doe',
    mobile: '9876543210',
    email: 'john.doe@example.com',
    address: '123 Main Street, Bangalore, Karnataka',
    dob: '1990-01-15',
    gender: 'Male',
    otp: '123456' // Fixed OTP for testing
  },
  '987654321098': {
    name: 'Jane Smith',
    mobile: '8765432109',
    email: 'jane.smith@example.com',
    address: '456 Park Avenue, Mumbai, Maharashtra',
    dob: '1985-05-20',
    gender: 'Female',
    otp: '654321' // Fixed OTP for testing
  },
  '111111111111': {
    name: 'Test User',
    mobile: '9999999999',
    email: 'test@example.com',
    address: '789 Test Road, Delhi, Delhi',
    dob: '1995-12-01',
    gender: 'Male',
    otp: '111111' // Fixed OTP for testing
  }
};

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

    // Check if this is a dummy Aadhaar number for testing
    const dummyData = DUMMY_AADHAAR_DATA[aadhaarNumber];
    let otp: string;
    let txnId: string;

    if (dummyData) {
      // Use fixed OTP for dummy data
      otp = dummyData.otp;
      txnId = `dummy_txn_${aadhaarNumber}`;
      console.log(`🧪 DUMMY DATA - Aadhaar: ${aadhaarNumber}, Name: ${dummyData.name}, Mobile: ${dummyData.mobile}`);
    } else {
      // Generate random OTP for other numbers
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Store OTP with expiration (5 minutes)
    otpStorage.set(aadhaarNumber, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      txnId
    });

    // Log OTP for development/testing
    console.log(`📱 OTP for Aadhaar ${aadhaarNumber}: ${otp} (TXN: ${txnId})`);
    if (dummyData) {
      console.log(`   👤 User: ${dummyData.name} (${dummyData.mobile})`);
    }

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

    console.log(`🔍 OTP Verification Request:`, {
      aadhaarNumber,
      otp,
      txnId,
      userAddress
    });

    if (!aadhaarNumber || !otp || !txnId || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Get stored OTP data
    const storedData = otpStorage.get(aadhaarNumber);
    
    console.log(`📋 Stored OTP Data:`, storedData);
    
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
    console.log(`🔐 OTP Comparison:`, {
      providedOTP: otp,
      storedOTP: storedData.otp,
      otpMatch: otp === storedData.otp
    });

    if (otp !== storedData.otp) {
      console.log(`❌ OTP mismatch for Aadhaar ${aadhaarNumber}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // For dummy data, we're more lenient with txnId matching
    const dummyData = DUMMY_AADHAAR_DATA[aadhaarNumber];
    console.log(`🎭 Dummy Data Check:`, {
      isDummyData: !!dummyData,
      providedTxnId: txnId,
      storedTxnId: storedData.txnId
    });

    if (!dummyData && txnId !== storedData.txnId) {
      console.log(`❌ Transaction ID mismatch for non-dummy data`);
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    // OTP verified successfully
    console.log(`✅ OTP verified successfully for Aadhaar ${aadhaarNumber}`);
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

  // Get dummy data if available
  const dummyData = DUMMY_AADHAAR_DATA[aadhaarNumber];
  
  let xmlData: string;
  
  if (dummyData) {
    // Use dummy data for realistic XML
    xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<PrintLetterBarcodeData>
  <uid>${aadhaarNumber}</uid>
  <name>${dummyData.name}</name>
  <gender>${dummyData.gender === 'Male' ? 'M' : 'F'}</gender>
  <yob>${dummyData.dob.split('-')[0]}</yob>
  <co>S/O Test Father</co>
  <house>${dummyData.address.split(',')[0]}</house>
  <street>${dummyData.address.split(',')[1] || 'Test Street'}</street>
  <lm>Test Locality</lm>
  <vtc>Test Village</vtc>
  <po>Test Post Office</po>
  <dist>${dummyData.address.split(',')[3] || 'Test District'}</dist>
  <state>${dummyData.address.split(',')[4] || 'Test State'}</state>
  <pc>123456</pc>
  <dob>${dummyData.dob.split('-').reverse().join('/')}</dob>
  <timestamp>${timestamp}</timestamp>
  <signature>${signature}</signature>
</PrintLetterBarcodeData>`;
  } else {
    // Fallback for non-dummy numbers
    xmlData = `<?xml version="1.0" encoding="UTF-8"?>
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
  }

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
