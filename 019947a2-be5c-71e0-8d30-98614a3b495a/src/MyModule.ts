import { Module } from "@nestjs/common";

import { AuthRegularuserController } from "./controllers/auth/regularUser/AuthRegularuserController";
import { ChatappRegularuserAuthenticationsessionsController } from "./controllers/chatApp/regularUser/authenticationSessions/ChatappRegularuserAuthenticationsessionsController";
import { ChatappRegularuserNotificationsController } from "./controllers/chatApp/regularUser/notifications/ChatappRegularuserNotificationsController";
import { ChatappRegularuserRegularusersController } from "./controllers/chatApp/regularUser/regularUsers/ChatappRegularuserRegularusersController";
import { ChatappRegularuserRegularusersAuthenticationsessionsController } from "./controllers/chatApp/regularUser/regularUsers/authenticationSessions/ChatappRegularuserRegularusersAuthenticationsessionsController";
import { ChatappRegularuserRegularusersNotificationsController } from "./controllers/chatApp/regularUser/regularUsers/notifications/ChatappRegularuserRegularusersNotificationsController";
import { ChatappRegularuserGroupsController } from "./controllers/chatApp/regularUser/groups/ChatappRegularuserGroupsController";
import { ChatappRegularuserGroupsMembershipsController } from "./controllers/chatApp/regularUser/groups/memberships/ChatappRegularuserGroupsMembershipsController";
import { ChatappRegularuserMessagesController } from "./controllers/chatApp/regularUser/messages/ChatappRegularuserMessagesController";
import { ChatappRegularuserMessagesMediaattachmentsController } from "./controllers/chatApp/regularUser/messages/mediaAttachments/ChatappRegularuserMessagesMediaattachmentsController";

@Module({
  controllers: [
    AuthRegularuserController,
    ChatappRegularuserAuthenticationsessionsController,
    ChatappRegularuserNotificationsController,
    ChatappRegularuserRegularusersController,
    ChatappRegularuserRegularusersAuthenticationsessionsController,
    ChatappRegularuserRegularusersNotificationsController,
    ChatappRegularuserGroupsController,
    ChatappRegularuserGroupsMembershipsController,
    ChatappRegularuserMessagesController,
    ChatappRegularuserMessagesMediaattachmentsController,
  ],
})
export class MyModule {}
