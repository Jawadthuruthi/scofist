const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI);
const User = mongoose.model('User', new mongoose.Schema({ _id: String }, { strict: false }));
const Attendance = mongoose.model('Attendance', new mongoose.Schema({ _id: mongoose.Schema.Types.ObjectId, teacherId: String }, { strict: false }));
const TimeTable = mongoose.model('TimeTable', new mongoose.Schema({ _id: mongoose.Schema.Types.ObjectId, 'timeSlots.teacherId': String }, { strict: false }));
const TeacherAttendance = mongoose.model('TeacherAttendance', new mongoose.Schema({ _id: mongoose.Schema.Types.ObjectId, teacherId: String }, { strict: false }));

async function run() {
  const teacher = await User.findOne({ _id: { $regex: /tch-002/i } }).lean();
  console.log('Teacher tch-002 exists:', !!teacher, teacher ? teacher._id : '');
  
  if (teacher) {
    const atts = await Attendance.find({ teacherId: teacher._id }).lean();
    console.log('Atts using teacher._id count:', atts.length);
    const septAtts = atts.filter(d => new Date(d.date).toISOString().includes('2026-09-01'));
    console.log('Sept 1 Atts:');
    console.log(JSON.stringify(septAtts.map(a => ({
      _id: a._id,
      date: a.date,
      classId: a.classId,
      subjectId: a.subjectId,
      periodNumber: a.periodNumber,
      teacherId: a.teacherId,
      leaveReason: a.leaveReason
    })), null, 2));

    const timetables = await TimeTable.find({ 'timeSlots.teacherId': teacher._id }).lean();
    console.log('Timetables count:', timetables.length);
    
    const teacherAtt = await TeacherAttendance.findOne({ teacherId: teacher._id }).lean();
    console.log('TeacherAttendance exists:', !!teacherAtt);
    if (teacherAtt) {
      console.log('TeacherAttendance records count:', (teacherAtt.attendanceRecords || []).length);
      console.log('TeacherAttendance Sept 1:', (teacherAtt.attendanceRecords || []).filter(r => new Date(r.date).toISOString().includes('2026-09-01')));
    }
  }

  process.exit(0);
}
run();
