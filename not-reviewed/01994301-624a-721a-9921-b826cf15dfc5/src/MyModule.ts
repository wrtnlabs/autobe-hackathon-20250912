import { Module } from "@nestjs/common";

import { AuthHrrecruiterController } from "./controllers/auth/hrRecruiter/AuthHrrecruiterController";
import { AuthApplicantController } from "./controllers/auth/applicant/AuthApplicantController";
import { AuthTechreviewerController } from "./controllers/auth/techReviewer/AuthTechreviewerController";
import { AuthSystemadminController } from "./controllers/auth/systemAdmin/AuthSystemadminController";
import { AtsrecruitmentSystemadminSystemsettingsController } from "./controllers/atsRecruitment/systemAdmin/systemSettings/AtsrecruitmentSystemadminSystemsettingsController";
import { AtsrecruitmentSystemadminExternalapicredentialsController } from "./controllers/atsRecruitment/systemAdmin/externalApiCredentials/AtsrecruitmentSystemadminExternalapicredentialsController";
import { AtsrecruitmentEnumsController } from "./controllers/atsRecruitment/enums/AtsrecruitmentEnumsController";
import { AtsrecruitmentSystemadminEnumsController } from "./controllers/atsRecruitment/systemAdmin/enums/AtsrecruitmentSystemadminEnumsController";
import { AtsrecruitmentSystemadminAudittrailsController } from "./controllers/atsRecruitment/systemAdmin/auditTrails/AtsrecruitmentSystemadminAudittrailsController";
import { AtsrecruitmentHrrecruiterApplicantsController } from "./controllers/atsRecruitment/hrRecruiter/applicants/AtsrecruitmentHrrecruiterApplicantsController";
import { AtsrecruitmentSystemadminApplicantsController } from "./controllers/atsRecruitment/systemAdmin/applicants/AtsrecruitmentSystemadminApplicantsController";
import { AtsrecruitmentApplicantApplicantsController } from "./controllers/atsRecruitment/applicant/applicants/AtsrecruitmentApplicantApplicantsController";
import { AtsrecruitmentSystemadminHrrecruitersController } from "./controllers/atsRecruitment/systemAdmin/hrRecruiters/AtsrecruitmentSystemadminHrrecruitersController";
import { AtsrecruitmentSystemadminTechreviewersController } from "./controllers/atsRecruitment/systemAdmin/techReviewers/AtsrecruitmentSystemadminTechreviewersController";
import { AtsrecruitmentHrrecruiterTechreviewersController } from "./controllers/atsRecruitment/hrRecruiter/techReviewers/AtsrecruitmentHrrecruiterTechreviewersController";
import { AtsrecruitmentSystemadminSystemadminsController } from "./controllers/atsRecruitment/systemAdmin/systemAdmins/AtsrecruitmentSystemadminSystemadminsController";
import { AtsrecruitmentHrrecruiterJobpostingsController } from "./controllers/atsRecruitment/hrRecruiter/jobPostings/AtsrecruitmentHrrecruiterJobpostingsController";
import { AtsrecruitmentSystemadminJobpostingsController } from "./controllers/atsRecruitment/systemAdmin/jobPostings/AtsrecruitmentSystemadminJobpostingsController";
import { AtsrecruitmentJobpostingsController } from "./controllers/atsRecruitment/jobPostings/AtsrecruitmentJobpostingsController";
import { AtsrecruitmentSystemadminJobskillsController } from "./controllers/atsRecruitment/systemAdmin/jobSkills/AtsrecruitmentSystemadminJobskillsController";
import { AtsrecruitmentHrrecruiterJobskillsController } from "./controllers/atsRecruitment/hrRecruiter/jobSkills/AtsrecruitmentHrrecruiterJobskillsController";
import { AtsrecruitmentTechreviewerJobskillsController } from "./controllers/atsRecruitment/techReviewer/jobSkills/AtsrecruitmentTechreviewerJobskillsController";
import { AtsrecruitmentHrrecruiterJobemploymenttypesController } from "./controllers/atsRecruitment/hrRecruiter/jobEmploymentTypes/AtsrecruitmentHrrecruiterJobemploymenttypesController";
import { AtsrecruitmentSystemadminJobemploymenttypesController } from "./controllers/atsRecruitment/systemAdmin/jobEmploymentTypes/AtsrecruitmentSystemadminJobemploymenttypesController";
import { AtsrecruitmentSystemadminJobpostingstatesController } from "./controllers/atsRecruitment/systemAdmin/jobPostingStates/AtsrecruitmentSystemadminJobpostingstatesController";
import { AtsrecruitmentHrrecruiterJobpostingstatesController } from "./controllers/atsRecruitment/hrRecruiter/jobPostingStates/AtsrecruitmentHrrecruiterJobpostingstatesController";
import { AtsrecruitmentHrrecruiterApplicationsController } from "./controllers/atsRecruitment/hrRecruiter/applications/AtsrecruitmentHrrecruiterApplicationsController";
import { AtsrecruitmentSystemadminApplicationsController } from "./controllers/atsRecruitment/systemAdmin/applications/AtsrecruitmentSystemadminApplicationsController";
import { AtsrecruitmentApplicantApplicationsController } from "./controllers/atsRecruitment/applicant/applications/AtsrecruitmentApplicantApplicationsController";
import { AtsrecruitmentHrrecruiterApplicationsStatushistoriesController } from "./controllers/atsRecruitment/hrRecruiter/applications/statusHistories/AtsrecruitmentHrrecruiterApplicationsStatushistoriesController";
import { AtsrecruitmentTechreviewerApplicationsStatushistoriesController } from "./controllers/atsRecruitment/techReviewer/applications/statusHistories/AtsrecruitmentTechreviewerApplicationsStatushistoriesController";
import { AtsrecruitmentSystemadminApplicationsStatushistoriesController } from "./controllers/atsRecruitment/systemAdmin/applications/statusHistories/AtsrecruitmentSystemadminApplicationsStatushistoriesController";
import { AtsrecruitmentHrrecruiterApplicationsFeedbacksController } from "./controllers/atsRecruitment/hrRecruiter/applications/feedbacks/AtsrecruitmentHrrecruiterApplicationsFeedbacksController";
import { AtsrecruitmentTechreviewerApplicationsFeedbacksController } from "./controllers/atsRecruitment/techReviewer/applications/feedbacks/AtsrecruitmentTechreviewerApplicationsFeedbacksController";
import { AtsrecruitmentSystemadminApplicationsFeedbacksController } from "./controllers/atsRecruitment/systemAdmin/applications/feedbacks/AtsrecruitmentSystemadminApplicationsFeedbacksController";
import { AtsrecruitmentHrrecruiterApplicationsSkillmatchesController } from "./controllers/atsRecruitment/hrRecruiter/applications/skillMatches/AtsrecruitmentHrrecruiterApplicationsSkillmatchesController";
import { AtsrecruitmentSystemadminApplicationsSkillmatchesController } from "./controllers/atsRecruitment/systemAdmin/applications/skillMatches/AtsrecruitmentSystemadminApplicationsSkillmatchesController";
import { AtsrecruitmentHrrecruiterResumesController } from "./controllers/atsRecruitment/hrRecruiter/resumes/AtsrecruitmentHrrecruiterResumesController";
import { AtsrecruitmentSystemadminResumesController } from "./controllers/atsRecruitment/systemAdmin/resumes/AtsrecruitmentSystemadminResumesController";
import { AtsrecruitmentApplicantResumesController } from "./controllers/atsRecruitment/applicant/resumes/AtsrecruitmentApplicantResumesController";
import { AtsrecruitmentApplicantResumesFilesController } from "./controllers/atsRecruitment/applicant/resumes/files/AtsrecruitmentApplicantResumesFilesController";
import { AtsrecruitmentApplicantResumesAianalysesController } from "./controllers/atsRecruitment/applicant/resumes/aiAnalyses/AtsrecruitmentApplicantResumesAianalysesController";
import { AtsrecruitmentHrrecruiterResumesAianalysesController } from "./controllers/atsRecruitment/hrRecruiter/resumes/aiAnalyses/AtsrecruitmentHrrecruiterResumesAianalysesController";
import { AtsrecruitmentTechreviewerResumesAianalysesController } from "./controllers/atsRecruitment/techReviewer/resumes/aiAnalyses/AtsrecruitmentTechreviewerResumesAianalysesController";
import { AtsrecruitmentHrrecruiterResumeuploadhistoriesController } from "./controllers/atsRecruitment/hrRecruiter/resumeUploadHistories/AtsrecruitmentHrrecruiterResumeuploadhistoriesController";
import { AtsrecruitmentSystemadminResumeuploadhistoriesController } from "./controllers/atsRecruitment/systemAdmin/resumeUploadHistories/AtsrecruitmentSystemadminResumeuploadhistoriesController";
import { AtsrecruitmentApplicantResumeuploadhistoriesController } from "./controllers/atsRecruitment/applicant/resumeUploadHistories/AtsrecruitmentApplicantResumeuploadhistoriesController";
import { AtsrecruitmentHrrecruiterCodingtestsController } from "./controllers/atsRecruitment/hrRecruiter/codingTests/AtsrecruitmentHrrecruiterCodingtestsController";
import { AtsrecruitmentTechreviewerCodingtestsController } from "./controllers/atsRecruitment/techReviewer/codingTests/AtsrecruitmentTechreviewerCodingtestsController";
import { AtsrecruitmentSystemadminCodingtestsController } from "./controllers/atsRecruitment/systemAdmin/codingTests/AtsrecruitmentSystemadminCodingtestsController";
import { AtsrecruitmentApplicantCodingtestsController } from "./controllers/atsRecruitment/applicant/codingTests/AtsrecruitmentApplicantCodingtestsController";
import { AtsrecruitmentHrrecruiterCodingtestsSubmissionsController } from "./controllers/atsRecruitment/hrRecruiter/codingTests/submissions/AtsrecruitmentHrrecruiterCodingtestsSubmissionsController";
import { AtsrecruitmentTechreviewerCodingtestsSubmissionsController } from "./controllers/atsRecruitment/techReviewer/codingTests/submissions/AtsrecruitmentTechreviewerCodingtestsSubmissionsController";
import { AtsrecruitmentSystemadminCodingtestsSubmissionsController } from "./controllers/atsRecruitment/systemAdmin/codingTests/submissions/AtsrecruitmentSystemadminCodingtestsSubmissionsController";
import { AtsrecruitmentApplicantCodingtestsSubmissionsController } from "./controllers/atsRecruitment/applicant/codingTests/submissions/AtsrecruitmentApplicantCodingtestsSubmissionsController";
import { AtsrecruitmentTechreviewerCodingtestsResultsController } from "./controllers/atsRecruitment/techReviewer/codingTests/results/AtsrecruitmentTechreviewerCodingtestsResultsController";
import { AtsrecruitmentSystemadminCodingtestsResultsController } from "./controllers/atsRecruitment/systemAdmin/codingTests/results/AtsrecruitmentSystemadminCodingtestsResultsController";
import { AtsrecruitmentTechreviewerCodingtestsSubmissionsReviewcommentsController } from "./controllers/atsRecruitment/techReviewer/codingTests/submissions/reviewComments/AtsrecruitmentTechreviewerCodingtestsSubmissionsReviewcommentsController";
import { AtsrecruitmentHrrecruiterCodingtestsSubmissionsReviewcommentsController } from "./controllers/atsRecruitment/hrRecruiter/codingTests/submissions/reviewComments/AtsrecruitmentHrrecruiterCodingtestsSubmissionsReviewcommentsController";
import { AtsrecruitmentSystemadminCodingtestsSubmissionsReviewcommentsController } from "./controllers/atsRecruitment/systemAdmin/codingTests/submissions/reviewComments/AtsrecruitmentSystemadminCodingtestsSubmissionsReviewcommentsController";
import { AtsrecruitmentHrrecruiterCodingtestsExternallogsController } from "./controllers/atsRecruitment/hrRecruiter/codingTests/externalLogs/AtsrecruitmentHrrecruiterCodingtestsExternallogsController";
import { AtsrecruitmentSystemadminCodingtestsExternallogsController } from "./controllers/atsRecruitment/systemAdmin/codingTests/externalLogs/AtsrecruitmentSystemadminCodingtestsExternallogsController";
import { AtsrecruitmentHrrecruiterInterviewsController } from "./controllers/atsRecruitment/hrRecruiter/interviews/AtsrecruitmentHrrecruiterInterviewsController";
import { AtsrecruitmentSystemadminInterviewsController } from "./controllers/atsRecruitment/systemAdmin/interviews/AtsrecruitmentSystemadminInterviewsController";
import { AtsrecruitmentSystemadminInterviewsParticipantsController } from "./controllers/atsRecruitment/systemAdmin/interviews/participants/AtsrecruitmentSystemadminInterviewsParticipantsController";
import { AtsrecruitmentHrrecruiterInterviewsParticipantsController } from "./controllers/atsRecruitment/hrRecruiter/interviews/participants/AtsrecruitmentHrrecruiterInterviewsParticipantsController";
import { AtsrecruitmentTechreviewerInterviewsParticipantsController } from "./controllers/atsRecruitment/techReviewer/interviews/participants/AtsrecruitmentTechreviewerInterviewsParticipantsController";
import { AtsrecruitmentHrrecruiterInterviewsSchedulesController } from "./controllers/atsRecruitment/hrRecruiter/interviews/schedules/AtsrecruitmentHrrecruiterInterviewsSchedulesController";
import { AtsrecruitmentSystemadminInterviewsSchedulesController } from "./controllers/atsRecruitment/systemAdmin/interviews/schedules/AtsrecruitmentSystemadminInterviewsSchedulesController";
import { AtsrecruitmentTechreviewerInterviewsSchedulesController } from "./controllers/atsRecruitment/techReviewer/interviews/schedules/AtsrecruitmentTechreviewerInterviewsSchedulesController";
import { AtsrecruitmentHrrecruiterInterviewsCalendarsyncsController } from "./controllers/atsRecruitment/hrRecruiter/interviews/calendarSyncs/AtsrecruitmentHrrecruiterInterviewsCalendarsyncsController";
import { AtsrecruitmentSystemadminInterviewsCalendarsyncsController } from "./controllers/atsRecruitment/systemAdmin/interviews/calendarSyncs/AtsrecruitmentSystemadminInterviewsCalendarsyncsController";
import { AtsrecruitmentTechreviewerInterviewsCalendarsyncsController } from "./controllers/atsRecruitment/techReviewer/interviews/calendarSyncs/AtsrecruitmentTechreviewerInterviewsCalendarsyncsController";
import { AtsrecruitmentApplicantInterviewsCalendarsyncsController } from "./controllers/atsRecruitment/applicant/interviews/calendarSyncs/AtsrecruitmentApplicantInterviewsCalendarsyncsController";
import { AtsrecruitmentHrrecruiterInterviewsQuestionsController } from "./controllers/atsRecruitment/hrRecruiter/interviews/questions/AtsrecruitmentHrrecruiterInterviewsQuestionsController";
import { AtsrecruitmentTechreviewerInterviewsQuestionsController } from "./controllers/atsRecruitment/techReviewer/interviews/questions/AtsrecruitmentTechreviewerInterviewsQuestionsController";
import { AtsrecruitmentApplicantInterviewsQuestionsController } from "./controllers/atsRecruitment/applicant/interviews/questions/AtsrecruitmentApplicantInterviewsQuestionsController";
import { AtsrecruitmentSystemadminNotificationsController } from "./controllers/atsRecruitment/systemAdmin/notifications/AtsrecruitmentSystemadminNotificationsController";
import { AtsrecruitmentHrrecruiterNotificationsController } from "./controllers/atsRecruitment/hrRecruiter/notifications/AtsrecruitmentHrrecruiterNotificationsController";
import { AtsrecruitmentTechreviewerNotificationsController } from "./controllers/atsRecruitment/techReviewer/notifications/AtsrecruitmentTechreviewerNotificationsController";
import { AtsrecruitmentSystemadminNotificationsDeliveriesController } from "./controllers/atsRecruitment/systemAdmin/notifications/deliveries/AtsrecruitmentSystemadminNotificationsDeliveriesController";
import { AtsrecruitmentHrrecruiterNotificationsDeliveriesController } from "./controllers/atsRecruitment/hrRecruiter/notifications/deliveries/AtsrecruitmentHrrecruiterNotificationsDeliveriesController";
import { AtsrecruitmentSystemadminNotificationtemplatesController } from "./controllers/atsRecruitment/systemAdmin/notificationTemplates/AtsrecruitmentSystemadminNotificationtemplatesController";
import { AtsrecruitmentSystemadminNotificationsFailuresController } from "./controllers/atsRecruitment/systemAdmin/notifications/failures/AtsrecruitmentSystemadminNotificationsFailuresController";
import { AtsrecruitmentSystemadminExportjobsController } from "./controllers/atsRecruitment/systemAdmin/exportJobs/AtsrecruitmentSystemadminExportjobsController";
import { AtsrecruitmentHrrecruiterExportjobsController } from "./controllers/atsRecruitment/hrRecruiter/exportJobs/AtsrecruitmentHrrecruiterExportjobsController";
import { AtsrecruitmentHrrecruiterExportjobsDetailsController } from "./controllers/atsRecruitment/hrRecruiter/exportJobs/details/AtsrecruitmentHrrecruiterExportjobsDetailsController";
import { AtsrecruitmentSystemadminExportjobsDetailsController } from "./controllers/atsRecruitment/systemAdmin/exportJobs/details/AtsrecruitmentSystemadminExportjobsDetailsController";
import { AtsrecruitmentHrrecruiterExportjobsFailuresController } from "./controllers/atsRecruitment/hrRecruiter/exportJobs/failures/AtsrecruitmentHrrecruiterExportjobsFailuresController";
import { AtsrecruitmentSystemadminExportjobsFailuresController } from "./controllers/atsRecruitment/systemAdmin/exportJobs/failures/AtsrecruitmentSystemadminExportjobsFailuresController";
import { AtsrecruitmentSystemadminAccesslogsController } from "./controllers/atsRecruitment/systemAdmin/accessLogs/AtsrecruitmentSystemadminAccesslogsController";
import { AtsrecruitmentSystemadminDatadeletionlogsController } from "./controllers/atsRecruitment/systemAdmin/dataDeletionLogs/AtsrecruitmentSystemadminDatadeletionlogsController";
import { AtsrecruitmentSystemadminMaskinglogsController } from "./controllers/atsRecruitment/systemAdmin/maskingLogs/AtsrecruitmentSystemadminMaskinglogsController";
import { AtsrecruitmentSystemadminAuthenticationfailuresController } from "./controllers/atsRecruitment/systemAdmin/authenticationFailures/AtsrecruitmentSystemadminAuthenticationfailuresController";

@Module({
  controllers: [
    AuthHrrecruiterController,
    AuthApplicantController,
    AuthTechreviewerController,
    AuthSystemadminController,
    AtsrecruitmentSystemadminSystemsettingsController,
    AtsrecruitmentSystemadminExternalapicredentialsController,
    AtsrecruitmentEnumsController,
    AtsrecruitmentSystemadminEnumsController,
    AtsrecruitmentSystemadminAudittrailsController,
    AtsrecruitmentHrrecruiterApplicantsController,
    AtsrecruitmentSystemadminApplicantsController,
    AtsrecruitmentApplicantApplicantsController,
    AtsrecruitmentSystemadminHrrecruitersController,
    AtsrecruitmentSystemadminTechreviewersController,
    AtsrecruitmentHrrecruiterTechreviewersController,
    AtsrecruitmentSystemadminSystemadminsController,
    AtsrecruitmentHrrecruiterJobpostingsController,
    AtsrecruitmentSystemadminJobpostingsController,
    AtsrecruitmentJobpostingsController,
    AtsrecruitmentSystemadminJobskillsController,
    AtsrecruitmentHrrecruiterJobskillsController,
    AtsrecruitmentTechreviewerJobskillsController,
    AtsrecruitmentHrrecruiterJobemploymenttypesController,
    AtsrecruitmentSystemadminJobemploymenttypesController,
    AtsrecruitmentSystemadminJobpostingstatesController,
    AtsrecruitmentHrrecruiterJobpostingstatesController,
    AtsrecruitmentHrrecruiterApplicationsController,
    AtsrecruitmentSystemadminApplicationsController,
    AtsrecruitmentApplicantApplicationsController,
    AtsrecruitmentHrrecruiterApplicationsStatushistoriesController,
    AtsrecruitmentTechreviewerApplicationsStatushistoriesController,
    AtsrecruitmentSystemadminApplicationsStatushistoriesController,
    AtsrecruitmentHrrecruiterApplicationsFeedbacksController,
    AtsrecruitmentTechreviewerApplicationsFeedbacksController,
    AtsrecruitmentSystemadminApplicationsFeedbacksController,
    AtsrecruitmentHrrecruiterApplicationsSkillmatchesController,
    AtsrecruitmentSystemadminApplicationsSkillmatchesController,
    AtsrecruitmentHrrecruiterResumesController,
    AtsrecruitmentSystemadminResumesController,
    AtsrecruitmentApplicantResumesController,
    AtsrecruitmentApplicantResumesFilesController,
    AtsrecruitmentApplicantResumesAianalysesController,
    AtsrecruitmentHrrecruiterResumesAianalysesController,
    AtsrecruitmentTechreviewerResumesAianalysesController,
    AtsrecruitmentHrrecruiterResumeuploadhistoriesController,
    AtsrecruitmentSystemadminResumeuploadhistoriesController,
    AtsrecruitmentApplicantResumeuploadhistoriesController,
    AtsrecruitmentHrrecruiterCodingtestsController,
    AtsrecruitmentTechreviewerCodingtestsController,
    AtsrecruitmentSystemadminCodingtestsController,
    AtsrecruitmentApplicantCodingtestsController,
    AtsrecruitmentHrrecruiterCodingtestsSubmissionsController,
    AtsrecruitmentTechreviewerCodingtestsSubmissionsController,
    AtsrecruitmentSystemadminCodingtestsSubmissionsController,
    AtsrecruitmentApplicantCodingtestsSubmissionsController,
    AtsrecruitmentTechreviewerCodingtestsResultsController,
    AtsrecruitmentSystemadminCodingtestsResultsController,
    AtsrecruitmentTechreviewerCodingtestsSubmissionsReviewcommentsController,
    AtsrecruitmentHrrecruiterCodingtestsSubmissionsReviewcommentsController,
    AtsrecruitmentSystemadminCodingtestsSubmissionsReviewcommentsController,
    AtsrecruitmentHrrecruiterCodingtestsExternallogsController,
    AtsrecruitmentSystemadminCodingtestsExternallogsController,
    AtsrecruitmentHrrecruiterInterviewsController,
    AtsrecruitmentSystemadminInterviewsController,
    AtsrecruitmentSystemadminInterviewsParticipantsController,
    AtsrecruitmentHrrecruiterInterviewsParticipantsController,
    AtsrecruitmentTechreviewerInterviewsParticipantsController,
    AtsrecruitmentHrrecruiterInterviewsSchedulesController,
    AtsrecruitmentSystemadminInterviewsSchedulesController,
    AtsrecruitmentTechreviewerInterviewsSchedulesController,
    AtsrecruitmentHrrecruiterInterviewsCalendarsyncsController,
    AtsrecruitmentSystemadminInterviewsCalendarsyncsController,
    AtsrecruitmentTechreviewerInterviewsCalendarsyncsController,
    AtsrecruitmentApplicantInterviewsCalendarsyncsController,
    AtsrecruitmentHrrecruiterInterviewsQuestionsController,
    AtsrecruitmentTechreviewerInterviewsQuestionsController,
    AtsrecruitmentApplicantInterviewsQuestionsController,
    AtsrecruitmentSystemadminNotificationsController,
    AtsrecruitmentHrrecruiterNotificationsController,
    AtsrecruitmentTechreviewerNotificationsController,
    AtsrecruitmentSystemadminNotificationsDeliveriesController,
    AtsrecruitmentHrrecruiterNotificationsDeliveriesController,
    AtsrecruitmentSystemadminNotificationtemplatesController,
    AtsrecruitmentSystemadminNotificationsFailuresController,
    AtsrecruitmentSystemadminExportjobsController,
    AtsrecruitmentHrrecruiterExportjobsController,
    AtsrecruitmentHrrecruiterExportjobsDetailsController,
    AtsrecruitmentSystemadminExportjobsDetailsController,
    AtsrecruitmentHrrecruiterExportjobsFailuresController,
    AtsrecruitmentSystemadminExportjobsFailuresController,
    AtsrecruitmentSystemadminAccesslogsController,
    AtsrecruitmentSystemadminDatadeletionlogsController,
    AtsrecruitmentSystemadminMaskinglogsController,
    AtsrecruitmentSystemadminAuthenticationfailuresController,
  ],
})
export class MyModule {}
