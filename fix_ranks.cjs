const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const resultSchema = new mongoose.Schema({}, { strict: false, collection: 'results' });
const programRegistrationSchema = new mongoose.Schema({}, { strict: false, collection: 'programregistrations' });
const gradeSchemeSchema = new mongoose.Schema({}, { strict: false, collection: 'gradeschemes' });
const programSchema = new mongoose.Schema({}, { strict: false, collection: 'programs' });

const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);
const ProgramRegistration = mongoose.models.ProgramRegistration || mongoose.model('ProgramRegistration', programRegistrationSchema);
const GradeScheme = mongoose.models.GradeScheme || mongoose.model('GradeScheme', gradeSchemeSchema);
const Program = mongoose.models.Program || mongoose.model('Program', programSchema);

function calculateGrade(totalMarks, gradeSchemes) {
  for (const scheme of gradeSchemes) {
    const [min, max] = scheme.markRange.split("-").map(Number);
    if (totalMarks >= min && totalMarks <= max) {
      return {
        grade: scheme.grade,
        points: scheme.points,
      };
    }
  }
  return { grade: "-", points: 0 };
}

function calculateAverageMarks(marksByJudges) {
  if (!marksByJudges || marksByJudges.length === 0) return 0;
  const sum = marksByJudges.reduce((acc, mark) => acc + (mark || 0), 0);
  return Math.round(sum / marksByJudges.length);
}

async function fixRanks() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const gradeSchemes = await GradeScheme.find().sort({ points: -1 }).lean();
  
  const results = await Result.find().lean();
  console.log(`Found ${results.length} results to check.`);

  let updatedCount = 0;

  for (const result of results) {
    const programId = result.programId;
    if (!programId) continue;

    let progIdObj;
    try {
      progIdObj = new mongoose.Types.ObjectId(programId);
    } catch(e) {
      continue;
    }

    const program = await Program.findById(programId).lean();
    if (!program) continue;

    const registrations = await ProgramRegistration.find({ programId: progIdObj }).lean();
    if (registrations.length === 0) continue;

    const pointsScheme = program.pointScheme?.split(',').map(p => parseInt(p)) || [];

    const allParticipants = [];
    registrations.forEach(reg => {
      (reg.participants || []).forEach(p => {
        const averageMarks = calculateAverageMarks(p.marksByJudges);
        if (averageMarks > 0) {
          allParticipants.push({
            id: p.id, // String or ObjectId
            codeLetter: p.codeLetter,
            totalMarks: averageMarks,
          });
        }
      });
    });

    if (allParticipants.length === 0) continue;

    allParticipants.sort((a, b) => b.totalMarks - a.totalMarks);

    let currentRank = 1;
    const participants = allParticipants.map((p, index) => {
      if (index > 0 && p.totalMarks < allParticipants[index - 1].totalMarks) {
        currentRank = index + 1;
      }
      const { grade, points } = calculateGrade(p.totalMarks, gradeSchemes);
      const positionBonus = pointsScheme[currentRank - 1] || 0;

      return {
        id: p.id,
        codeLetter: p.codeLetter,
        grade,
        points: points + positionBonus,
        rank: currentRank,
      };
    });

    await Result.updateOne(
      { _id: result._id },
      { $set: { participants: participants } }
    );
    updatedCount++;
    console.log(`Updated result for program ${program.name}`);
  }

  console.log(`Successfully updated ${updatedCount} results!`);
  process.exit(0);
}

fixRanks().catch(console.error);
