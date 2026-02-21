import Candidate from '../models/Candidate.js';
import User from '../models/User.js';

// @desc    Get all candidates
// @route   GET /api/candidates
export const getCandidates = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.recruiterId = req.user._id;
    }
    const candidates = await Candidate.find(query).sort({ createdAt: -1 });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a candidate
// @route   POST /api/candidates
export const createCandidate = async (req, res) => {
  try {
    const body = { ...req.body };

    // Set name based on First & Last
    body.name = `${body.firstName || ''} ${body.lastName || ''}`.trim();

    // Skills handling
    if (typeof body.skills === 'string') {
      body.skills = body.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Recruiter Assignment logic
    let targetRecruiterId = req.user._id;
    let targetRecruiterName = req.user.name;

    if (req.user.role === 'admin' && body.recruiterId) {
      const assignedRecruiter = await User.findById(body.recruiterId);
      if (assignedRecruiter) {
        targetRecruiterId = assignedRecruiter._id;
        targetRecruiterName = assignedRecruiter.name;
      }
    }

    body.recruiterId = targetRecruiterId;
    body.recruiterName = targetRecruiterName;

    const candidate = await Candidate.create(body);
    res.status(201).json(candidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update candidate
// @route   PUT /api/candidates/:id
export const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (req.user.role !== 'admin' && candidate.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const body = { ...req.body };
    body.name = `${body.firstName || ''} ${body.lastName || ''}`.trim();

    if (typeof body.skills === 'string') {
      body.skills = body.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true }
    );

    res.json(updatedCandidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete candidate
// @route   DELETE /api/candidates/:id
export const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (req.user.role !== 'admin' && candidate.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await candidate.deleteOne();
    res.json({ message: 'Candidate removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};