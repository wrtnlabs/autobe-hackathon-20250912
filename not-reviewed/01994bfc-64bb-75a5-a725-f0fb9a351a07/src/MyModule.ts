import { Module } from "@nestjs/common";

import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { CommunityaiAdminSystemsettingsController } from "./controllers/communityAi/admin/systemSettings/CommunityaiAdminSystemsettingsController";
import { CommunityaiAdminRolesController } from "./controllers/communityAi/admin/roles/CommunityaiAdminRolesController";
import { CommunityaiAdminPermissionsController } from "./controllers/communityAi/admin/permissions/CommunityaiAdminPermissionsController";
import { CommunityaiAdminExternalservicesController } from "./controllers/communityAi/admin/externalServices/CommunityaiAdminExternalservicesController";
import { CommunityaiModeratorExternalservicesController } from "./controllers/communityAi/moderator/externalServices/CommunityaiModeratorExternalservicesController";
import { CommunityaiAdminAdminsController } from "./controllers/communityAi/admin/admins/CommunityaiAdminAdminsController";
import { CommunityaiAdminModeratorsController } from "./controllers/communityAi/admin/moderators/CommunityaiAdminModeratorsController";
import { CommunityaiModeratorModeratorsController } from "./controllers/communityAi/moderator/moderators/CommunityaiModeratorModeratorsController";
import { CommunityaiMemberMembersController } from "./controllers/communityAi/member/members/CommunityaiMemberMembersController";
import { CommunityaiMembersController } from "./controllers/communityAi/members/CommunityaiMembersController";
import { CommunityaiAdminMembersController } from "./controllers/communityAi/admin/members/CommunityaiAdminMembersController";
import { CommunityaiMemberMembersPostsController } from "./controllers/communityAi/member/members/posts/CommunityaiMemberMembersPostsController";
import { CommunityaiAdminMembersPostsController } from "./controllers/communityAi/admin/members/posts/CommunityaiAdminMembersPostsController";
import { CommunityaiModeratorMembersPostsController } from "./controllers/communityAi/moderator/members/posts/CommunityaiModeratorMembersPostsController";
import { CommunityaiAdminPostsController } from "./controllers/communityAi/admin/posts/CommunityaiAdminPostsController";
import { CommunityaiModeratorPostsController } from "./controllers/communityAi/moderator/posts/CommunityaiModeratorPostsController";
import { CommunityaiMemberPostsController } from "./controllers/communityAi/member/posts/CommunityaiMemberPostsController";
import { CommunityaiMemberPostsCommentsController } from "./controllers/communityAi/member/posts/comments/CommunityaiMemberPostsCommentsController";
import { CommunityaiModeratorPostsCommentsController } from "./controllers/communityAi/moderator/posts/comments/CommunityaiModeratorPostsCommentsController";
import { CommunityaiAdminPostsCommentsController } from "./controllers/communityAi/admin/posts/comments/CommunityaiAdminPostsCommentsController";
import { CommunityaiMemberCommentsController } from "./controllers/communityAi/member/comments/CommunityaiMemberCommentsController";
import { CommunityaiModeratorCommentsController } from "./controllers/communityAi/moderator/comments/CommunityaiModeratorCommentsController";
import { CommunityaiAdminCommentsController } from "./controllers/communityAi/admin/comments/CommunityaiAdminCommentsController";
import { CommunityaiMemberAicommentingAicommentsuggestionsController } from "./controllers/communityAi/member/aiCommenting/aiCommentSuggestions/CommunityaiMemberAicommentingAicommentsuggestionsController";
import { CommunityaiModeratorAicommentingAicommentsuggestionsController } from "./controllers/communityAi/moderator/aiCommenting/aiCommentSuggestions/CommunityaiModeratorAicommentingAicommentsuggestionsController";
import { CommunityaiAdminAicommentingAicommentsuggestionsController } from "./controllers/communityAi/admin/aiCommenting/aiCommentSuggestions/CommunityaiAdminAicommentingAicommentsuggestionsController";
import { CommunityaiAdminCommentsSentimentanalysesController } from "./controllers/communityAi/admin/comments/sentimentAnalyses/CommunityaiAdminCommentsSentimentanalysesController";
import { CommunityaiModeratorCommentsSentimentanalysesController } from "./controllers/communityAi/moderator/comments/sentimentAnalyses/CommunityaiModeratorCommentsSentimentanalysesController";
import { CommunityaiMemberCommentsSentimentanalysesController } from "./controllers/communityAi/member/comments/sentimentAnalyses/CommunityaiMemberCommentsSentimentanalysesController";
import { CommunityaiAdminAicommentingAigeneratedrepliesController } from "./controllers/communityAi/admin/aiCommenting/aiGeneratedReplies/CommunityaiAdminAicommentingAigeneratedrepliesController";
import { CommunityaiModeratorAicommentingAigeneratedrepliesController } from "./controllers/communityAi/moderator/aiCommenting/aiGeneratedReplies/CommunityaiModeratorAicommentingAigeneratedrepliesController";
import { CommunityaiMemberAicommentingAigeneratedrepliesController } from "./controllers/communityAi/member/aiCommenting/aiGeneratedReplies/CommunityaiMemberAicommentingAigeneratedrepliesController";
import { CommunityaiMemberFactcheckclaimsController } from "./controllers/communityAi/member/factcheckClaims/CommunityaiMemberFactcheckclaimsController";
import { CommunityaiAdminFactcheckclaimsController } from "./controllers/communityAi/admin/factcheckClaims/CommunityaiAdminFactcheckclaimsController";
import { CommunityaiModeratorFactcheckclaimsController } from "./controllers/communityAi/moderator/factcheckClaims/CommunityaiModeratorFactcheckclaimsController";
import { CommunityaiMemberFactcheckresultsController } from "./controllers/communityAi/member/factcheckResults/CommunityaiMemberFactcheckresultsController";
import { CommunityaiModeratorFactcheckflagsController } from "./controllers/communityAi/moderator/factcheckFlags/CommunityaiModeratorFactcheckflagsController";
import { CommunityaiAdminFactcheckflagsController } from "./controllers/communityAi/admin/factcheckFlags/CommunityaiAdminFactcheckflagsController";
import { CommunityaiModeratorContentflagsController } from "./controllers/communityAi/moderator/contentFlags/CommunityaiModeratorContentflagsController";
import { CommunityaiAdminContentflagsController } from "./controllers/communityAi/admin/contentFlags/CommunityaiAdminContentflagsController";
import { CommunityaiMemberContentflagsController } from "./controllers/communityAi/member/contentFlags/CommunityaiMemberContentflagsController";
import { CommunityaiModeratorContentflagsModeratorreviewsController } from "./controllers/communityAi/moderator/contentFlags/moderatorReviews/CommunityaiModeratorContentflagsModeratorreviewsController";
import { CommunityaiAdminContentflagsModeratorreviewsController } from "./controllers/communityAi/admin/contentFlags/moderatorReviews/CommunityaiAdminContentflagsModeratorreviewsController";
import { CommunityaiAdminUserreportsController } from "./controllers/communityAi/admin/userReports/CommunityaiAdminUserreportsController";
import { CommunityaiModeratorUserreportsController } from "./controllers/communityAi/moderator/userReports/CommunityaiModeratorUserreportsController";
import { CommunityaiMemberUserreportsController } from "./controllers/communityAi/member/userReports/CommunityaiMemberUserreportsController";
import { CommunityaiAdminUserreportsModeratorreviewsController } from "./controllers/communityAi/admin/userReports/moderatorReviews/CommunityaiAdminUserreportsModeratorreviewsController";
import { CommunityaiModeratorUserreportsModeratorreviewsController } from "./controllers/communityAi/moderator/userReports/moderatorReviews/CommunityaiModeratorUserreportsModeratorreviewsController";
import { CommunityaiModeratorModeratorreviewsController } from "./controllers/communityAi/moderator/moderatorReviews/CommunityaiModeratorModeratorreviewsController";
import { CommunityaiAdminModeratorreviewsController } from "./controllers/communityAi/admin/moderatorReviews/CommunityaiAdminModeratorreviewsController";
import { CommunityaiAdminAdminactionsController } from "./controllers/communityAi/admin/adminActions/CommunityaiAdminAdminactionsController";
import { CommunityaiMemberNotificationsController } from "./controllers/communityAi/member/notifications/CommunityaiMemberNotificationsController";
import { CommunityaiAdminNotificationsController } from "./controllers/communityAi/admin/notifications/CommunityaiAdminNotificationsController";
import { CommunityaiModeratorNotificationsController } from "./controllers/communityAi/moderator/notifications/CommunityaiModeratorNotificationsController";
import { CommunityaiMemberNotificationsStatusesController } from "./controllers/communityAi/member/notifications/statuses/CommunityaiMemberNotificationsStatusesController";
import { CommunityaiAdminNotificationsStatusesController } from "./controllers/communityAi/admin/notifications/statuses/CommunityaiAdminNotificationsStatusesController";
import { CommunityaiModeratorNotificationsStatusesController } from "./controllers/communityAi/moderator/notifications/statuses/CommunityaiModeratorNotificationsStatusesController";
import { CommunityaiMemberUsernotificationpreferencesController } from "./controllers/communityAi/member/userNotificationPreferences/CommunityaiMemberUsernotificationpreferencesController";
import { CommunityaiAdminUsersessionsController } from "./controllers/communityAi/admin/userSessions/CommunityaiAdminUsersessionsController";
import { CommunityaiMemberUsersessionsController } from "./controllers/communityAi/member/userSessions/CommunityaiMemberUsersessionsController";
import { CommunityaiMemberUsersessionsJwttokensController } from "./controllers/communityAi/member/userSessions/jwtTokens/CommunityaiMemberUsersessionsJwttokensController";
import { CommunityaiAdminAiserviceprovidersController } from "./controllers/communityAi/admin/aiServiceProviders/CommunityaiAdminAiserviceprovidersController";
import { CommunityaiAdminNotificationprovidersController } from "./controllers/communityAi/admin/notificationProviders/CommunityaiAdminNotificationprovidersController";
import { CommunityaiNotificationprovidersController } from "./controllers/communityAi/notificationProviders/CommunityaiNotificationprovidersController";
import { CommunityaiAdminApiusagelogsController } from "./controllers/communityAi/admin/apiUsageLogs/CommunityaiAdminApiusagelogsController";
import { CommunityaiAdminAuditlogsController } from "./controllers/communityAi/admin/auditLogs/CommunityaiAdminAuditlogsController";
import { CommunityaiAdminAuditcontentaccesslogsController } from "./controllers/communityAi/admin/auditContentAccessLogs/CommunityaiAdminAuditcontentaccesslogsController";
import { CommunityaiModeratorAuditcontentaccesslogsController } from "./controllers/communityAi/moderator/auditContentAccessLogs/CommunityaiModeratorAuditcontentaccesslogsController";
import { CommunityaiAdminAuditedithistoriesController } from "./controllers/communityAi/admin/auditEditHistories/CommunityaiAdminAuditedithistoriesController";
import { CommunityaiModeratorAuditedithistoriesController } from "./controllers/communityAi/moderator/auditEditHistories/CommunityaiModeratorAuditedithistoriesController";

@Module({
  controllers: [
    AuthAdminController,
    AuthModeratorController,
    AuthMemberController,
    CommunityaiAdminSystemsettingsController,
    CommunityaiAdminRolesController,
    CommunityaiAdminPermissionsController,
    CommunityaiAdminExternalservicesController,
    CommunityaiModeratorExternalservicesController,
    CommunityaiAdminAdminsController,
    CommunityaiAdminModeratorsController,
    CommunityaiModeratorModeratorsController,
    CommunityaiMemberMembersController,
    CommunityaiMembersController,
    CommunityaiAdminMembersController,
    CommunityaiMemberMembersPostsController,
    CommunityaiAdminMembersPostsController,
    CommunityaiModeratorMembersPostsController,
    CommunityaiAdminPostsController,
    CommunityaiModeratorPostsController,
    CommunityaiMemberPostsController,
    CommunityaiMemberPostsCommentsController,
    CommunityaiModeratorPostsCommentsController,
    CommunityaiAdminPostsCommentsController,
    CommunityaiMemberCommentsController,
    CommunityaiModeratorCommentsController,
    CommunityaiAdminCommentsController,
    CommunityaiMemberAicommentingAicommentsuggestionsController,
    CommunityaiModeratorAicommentingAicommentsuggestionsController,
    CommunityaiAdminAicommentingAicommentsuggestionsController,
    CommunityaiAdminCommentsSentimentanalysesController,
    CommunityaiModeratorCommentsSentimentanalysesController,
    CommunityaiMemberCommentsSentimentanalysesController,
    CommunityaiAdminAicommentingAigeneratedrepliesController,
    CommunityaiModeratorAicommentingAigeneratedrepliesController,
    CommunityaiMemberAicommentingAigeneratedrepliesController,
    CommunityaiMemberFactcheckclaimsController,
    CommunityaiAdminFactcheckclaimsController,
    CommunityaiModeratorFactcheckclaimsController,
    CommunityaiMemberFactcheckresultsController,
    CommunityaiModeratorFactcheckflagsController,
    CommunityaiAdminFactcheckflagsController,
    CommunityaiModeratorContentflagsController,
    CommunityaiAdminContentflagsController,
    CommunityaiMemberContentflagsController,
    CommunityaiModeratorContentflagsModeratorreviewsController,
    CommunityaiAdminContentflagsModeratorreviewsController,
    CommunityaiAdminUserreportsController,
    CommunityaiModeratorUserreportsController,
    CommunityaiMemberUserreportsController,
    CommunityaiAdminUserreportsModeratorreviewsController,
    CommunityaiModeratorUserreportsModeratorreviewsController,
    CommunityaiModeratorModeratorreviewsController,
    CommunityaiAdminModeratorreviewsController,
    CommunityaiAdminAdminactionsController,
    CommunityaiMemberNotificationsController,
    CommunityaiAdminNotificationsController,
    CommunityaiModeratorNotificationsController,
    CommunityaiMemberNotificationsStatusesController,
    CommunityaiAdminNotificationsStatusesController,
    CommunityaiModeratorNotificationsStatusesController,
    CommunityaiMemberUsernotificationpreferencesController,
    CommunityaiAdminUsersessionsController,
    CommunityaiMemberUsersessionsController,
    CommunityaiMemberUsersessionsJwttokensController,
    CommunityaiAdminAiserviceprovidersController,
    CommunityaiAdminNotificationprovidersController,
    CommunityaiNotificationprovidersController,
    CommunityaiAdminApiusagelogsController,
    CommunityaiAdminAuditlogsController,
    CommunityaiAdminAuditcontentaccesslogsController,
    CommunityaiModeratorAuditcontentaccesslogsController,
    CommunityaiAdminAuditedithistoriesController,
    CommunityaiModeratorAuditedithistoriesController,
  ],
})
export class MyModule {}
