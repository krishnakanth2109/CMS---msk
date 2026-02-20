import Interview from '../models/Interview.js';
import Candidate from '../models/Candidate.js';

// @desc    Get interviews (Admin: All, Recruiter: Own)
// @route   GET /api/interviews
export const getInterviews = async (req, res) => {
  try {
    let query = {};
    // If user is NOT admin, filter by their ID
    if (req.user.role !== 'admin') {
      query.recruiterId = req.user._id;
    }

    const interviews = await Interview.find(query)
      .populate('candidateId', 'name email phone position')
      .populate('recruiterId', 'name email')
      .sort({ interviewDate: 1 });

    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Schedule a new interview
// @route   POST /api/interviews
export const createInterview = async (req, res) => {
  try {
    const { 
      candidateId, interviewDate, interviewTime, type, location, 
      duration, notes, priority, round, meetingLink 
    } = req.body;

    // Combine Date & Time
    const dateTime = new Date(`${interviewDate}T${interviewTime}`);

    // Create Interview
    const interview = await Interview.create({
      candidateId,
      recruiterId: req.user._id, // Assigned to logged-in user
      interviewDate: dateTime,
      duration: parseInt(duration) || 60,
      type,
      location,
      meetingLink,
      notes,
      priority,
      round
    });

    // Update Candidate Status
    await Candidate.findByIdAndUpdate(candidateId, { status: round });

    res.status(201).json(interview);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete interview
// @route   DELETE /api/interviews/:id
export const deleteInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Not found' });
    
    await interview.deleteOne();
    res.json({ message: 'Interview removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};