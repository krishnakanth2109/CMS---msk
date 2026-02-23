import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js'; 
import { parseResume } from './resumeParser.js'; 
import { protect } from '../middleware/authMiddleware.js'; 
import { updateCandidateStatus, updateCandidateRemarks, inlineUpdateCandidate } from '../controllers/candidateStatusController.js';

import { bulkImportCandidates } from '../controllers/bulkImportController.js'; 

const router = express.Router();

// --- 1. Multer Setup (Disk Storage) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Docx allowed.'));
    }
  }
});

// Multer config for Excel uploads
const excelUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedExcelTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) allowed.'));
    }
  }
});

// Apply Authentication
router.use(protect);

// --- HELPER FUNCTION ---
// Fix data types from FormData (Multer converts everything to strings)
const sanitizeBody = (body) => {
  const data = { ...body };
  
  if (typeof data.skills === 'string') {
    data.skills = data.skills.split(',').map(s => s.trim());
  }
  
  // Convert "true"/"false" strings to Booleans
  if (data.offersInHand === 'true') data.offersInHand = true;
  if (data.offersInHand === 'false') data.offersInHand = false;
  
  if (data.servingNoticePeriod === 'true') data.servingNoticePeriod = true;
  if (data.servingNoticePeriod === 'false') data.servingNoticePeriod = false;

  return data;
};

// ==========================================
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES)
// ==========================================

// 1. Bulk Import Candidates from Excel
router.post('/bulk-import', excelUpload.single('file'), bulkImportCandidates);

// 2. Bulk Assign Recruiter
// MOVED UP: This must be before router.put('/:id')
router.put('/bulk-assign', async (req, res) => {
  try {
    const { candidateIds, recruiterId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'No candidates selected' });
    }

    if (!recruiterId) {
      return res.status(400).json({ message: 'Target recruiter is required' });
    }

    // Verify Recruiter exists
    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({ message: 'Recruiter not found' });
    }

    // Update candidates
    const result = await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      { 
        $set: { 
          recruiterId: recruiter._id,
          recruiterName: `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim() || recruiter.email 
        } 
      }
    );

    res.json({ 
      success: true, 
      message: `Successfully assigned ${result.modifiedCount} candidates to ${recruiter.firstName || ''} ${recruiter.lastName || ''}` 
    });

  } catch (error) {
    console.error("Bulk Assign Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// 3. Parse Resume
router.post('/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const parsedResult = await parseResume(fileBuffer, req.file.mimetype);

    try { fs.unlinkSync(req.file.path); } catch (err) { console.error("Failed to delete temp file:", err); }

    if (parsedResult.success) {
      res.json({
        success: true,
        data: {
          name: parsedResult.data.name || '',
          email: parsedResult.data.email || '',
          contact: parsedResult.data.contact || '',
          skills: parsedResult.data.skills || '',
          totalExperience: parsedResult.data.totalExperience || '',
          position: parsedResult.data.position || '',
        }
      });
    } else {
      res.json({ success: false, message: 'Could not parse resume', data: {} });
    }
  } catch (error) {
    console.error("Resume parsing error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
    }
    res.status(500).json({ success: false, message: 'Error parsing resume', error: error.message });
  }
});

// 4. Get All Candidates
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role !== 'admin') {
      query.recruiterId = req.user._id;
    }
    const candidates = await Candidate.find(query)
      .populate('recruiterId', 'firstName lastName name email')
      .sort({ createdAt: -1 });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Create Candidate
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    let candidateData = sanitizeBody(req.body);

    if (req.file) {
      candidateData.resumeUrl = `/uploads/${req.file.filename}`;
      candidateData.resumeOriginalName = req.file.originalname;
    }

    let targetRecruiterId = req.user._id;
    let targetRecruiterName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;

    if (req.user.role === 'admin' && candidateData.recruiterId) {
      const assignedRecruiter = await User.findById(candidateData.recruiterId);
      if (assignedRecruiter) {
        targetRecruiterId = assignedRecruiter._id;
        targetRecruiterName = `${assignedRecruiter.firstName || ''} ${assignedRecruiter.lastName || ''}`.trim() || assignedRecruiter.email;
      }
    }

    candidateData.recruiterId = targetRecruiterId;
    candidateData.recruiterName = targetRecruiterName;

    const newCandidate = new Candidate(candidateData);
    await newCandidate.save();
    
    res.status(201).json(newCandidate);
  } catch (error) {
    console.error("Create Error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================================
// DYNAMIC ROUTES (/:id) - MUST BE LAST
// ==========================================

// Specialized status/remarks/inline update routes
router.put('/:id/status', updateCandidateStatus);
router.put('/:id/remarks', updateCandidateRemarks);
router.put('/:id/inline-update', inlineUpdateCandidate);

// Get Single Candidate
router.get('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('recruiterId', 'firstName lastName name email');
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (req.user.role !== 'admin' && candidate.recruiterId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this candidate' });
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Candidate
router.put('/:id', upload.single('resume'), async (req, res) => {
  try {
    let updateData = sanitizeBody(req.body);

    const existingCandidate = await Candidate.findById(req.params.id);
    if (!existingCandidate) return res.status(404).json({ message: 'Candidate not found' });

    if (req.user.role !== 'admin' && existingCandidate.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.file) {
      updateData.resumeUrl = `/uploads/${req.file.filename}`;
      updateData.resumeOriginalName = req.file.originalname;
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedCandidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Candidate
router.delete('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (req.user.role !== 'admin' && candidate.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (candidate.resumeUrl) {
      const filePath = path.join(process.cwd(), candidate.resumeUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error("File delete error:", e); }
      }
    }

    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Candidate deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;