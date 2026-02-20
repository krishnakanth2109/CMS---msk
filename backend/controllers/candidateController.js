import Candidate from '../models/Candidate.js';
import User from '../models/User.js';

// @desc    Get all candidates (Admin: All, Recruiter: Own)
// @route   GET /api/candidates
// @access  Private
export const getCandidates = async (req, res) => {
  try {
    let query = {};
    
    // If user is NOT admin, only show their candidates
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
// @access  Private
export const createCandidate = async (req, res) => {
  try {
    const { 
      name, email, contact, position, skills, client, status,
      totalExperience, relevantExperience, ctc, ectc, takeHomeSalary, 
      noticePeriod, // Legacy field
      
      // NEW FIELDS
      offersInHand, offerPackage, 
      servingNoticePeriod, noticePeriodDays,

      assignedJobId, reasonForChange, dateAdded, active, 
      recruiterId 
    } = req.body;

    // Determine Recruiter: If Admin sent an ID, use it. Otherwise use logged-in user.
    let targetRecruiterId = req.user._id;
    let targetRecruiterName = req.user.name;

    if (req.user.role === 'admin' && recruiterId) {
      const assignedRecruiter = await User.findById(recruiterId);
      if (assignedRecruiter) {
        targetRecruiterId = assignedRecruiter._id;
        targetRecruiterName = assignedRecruiter.name;
      }
    }

    const candidate = await Candidate.create({
      name, email, contact, position, 
      skills: Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()),
      client, status,
      totalExperience, relevantExperience, ctc, ectc, takeHomeSalary, 
      
      // Mapped New Fields
      noticePeriod, 
      offersInHand, 
      offerPackage, 
      servingNoticePeriod, 
      noticePeriodDays,

      assignedJobId, reasonForChange, dateAdded, active,
      recruiterId: targetRecruiterId,
      recruiterName: targetRecruiterName
    });

    res.status(201).json(candidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update candidate
// @route   PUT /api/candidates/:id
// @access  Private
export const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check ownership if not admin
    if (req.user.role !== 'admin' && candidate.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedCandidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete candidate
// @route   DELETE /api/candidates/:id
// @access  Private
export const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check ownership if not admin
    if (req.user.role !== 'admin' && candidate.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await candidate.deleteOne();
    res.json({ message: 'Candidate removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};