import { Module } from "@nestjs/common";

import { AuthStudentController } from "./controllers/auth/student/AuthStudentController";
import { StudyplannerStudentStudentsController } from "./controllers/studyPlanner/student/students/StudyplannerStudentStudentsController";
import { StudyplannerStudentStudyphasesController } from "./controllers/studyPlanner/student/studyPhases/StudyplannerStudentStudyphasesController";
import { StudyplannerStudentSubjectcategoriesController } from "./controllers/studyPlanner/student/subjectCategories/StudyplannerStudentSubjectcategoriesController";
import { StudyplannerStudentStudytasksController } from "./controllers/studyPlanner/student/studyTasks/StudyplannerStudentStudytasksController";
import { StudyplannerStudentStudytasksProgressController } from "./controllers/studyPlanner/student/studyTasks/progress/StudyplannerStudentStudytasksProgressController";
import { StudyplannerStudentStudytasksAttachmentsController } from "./controllers/studyPlanner/student/studyTasks/attachments/StudyplannerStudentStudytasksAttachmentsController";
import { StudyplannerStudentStudytasksMemosController } from "./controllers/studyPlanner/student/studyTasks/memos/StudyplannerStudentStudytasksMemosController";
import { StudyplannerStudentTaskalarmsController } from "./controllers/studyPlanner/student/taskAlarms/StudyplannerStudentTaskalarmsController";
import { StudyplannerStudentGeneralremindersController } from "./controllers/studyPlanner/student/generalReminders/StudyplannerStudentGeneralremindersController";
import { StudyplannerStudentStudyprogressanalyticsController } from "./controllers/studyPlanner/student/studyProgressAnalytics/StudyplannerStudentStudyprogressanalyticsController";
import { StudyplannerStudentLearninggapchartsController } from "./controllers/studyPlanner/student/learningGapCharts/StudyplannerStudentLearninggapchartsController";

@Module({
  controllers: [
    AuthStudentController,
    StudyplannerStudentStudentsController,
    StudyplannerStudentStudyphasesController,
    StudyplannerStudentSubjectcategoriesController,
    StudyplannerStudentStudytasksController,
    StudyplannerStudentStudytasksProgressController,
    StudyplannerStudentStudytasksAttachmentsController,
    StudyplannerStudentStudytasksMemosController,
    StudyplannerStudentTaskalarmsController,
    StudyplannerStudentGeneralremindersController,
    StudyplannerStudentStudyprogressanalyticsController,
    StudyplannerStudentLearninggapchartsController,
  ],
})
export class MyModule {}
