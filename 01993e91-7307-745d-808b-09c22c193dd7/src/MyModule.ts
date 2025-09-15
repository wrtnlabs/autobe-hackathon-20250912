import { Module } from "@nestjs/common";

import { AuthTpmController } from "./controllers/auth/tpm/AuthTpmController";
import { AuthPmController } from "./controllers/auth/pm/AuthPmController";
import { AuthPmoController } from "./controllers/auth/pmo/AuthPmoController";
import { AuthDeveloperController } from "./controllers/auth/developer/AuthDeveloperController";
import { AuthDesignerController } from "./controllers/auth/designer/AuthDesignerController";
import { AuthQaController } from "./controllers/auth/qa/AuthQaController";
import { TaskmanagementTpmTaskmanagementrolesController } from "./controllers/taskManagement/tpm/taskManagementRoles/TaskmanagementTpmTaskmanagementrolesController";
import { TaskmanagementPmTaskmanagementrolesController } from "./controllers/taskManagement/pm/taskManagementRoles/TaskmanagementPmTaskmanagementrolesController";
import { TaskmanagementPmoTaskmanagementrolesController } from "./controllers/taskManagement/pmo/taskManagementRoles/TaskmanagementPmoTaskmanagementrolesController";
import { TaskmanagementTpmTaskmanagementtaskstatusesController } from "./controllers/taskManagement/tpm/taskManagementTaskStatuses/TaskmanagementTpmTaskmanagementtaskstatusesController";
import { TaskmanagementPmTaskmanagementtaskstatusesController } from "./controllers/taskManagement/pm/taskManagementTaskStatuses/TaskmanagementPmTaskmanagementtaskstatusesController";
import { TaskmanagementPmoTaskmanagementtaskstatusesController } from "./controllers/taskManagement/pmo/taskManagementTaskStatuses/TaskmanagementPmoTaskmanagementtaskstatusesController";
import { TaskmanagementDeveloperTaskmanagementtaskstatusesController } from "./controllers/taskManagement/developer/taskManagementTaskStatuses/TaskmanagementDeveloperTaskmanagementtaskstatusesController";
import { TaskmanagementDesignerTaskmanagementtaskstatusesController } from "./controllers/taskManagement/designer/taskManagementTaskStatuses/TaskmanagementDesignerTaskmanagementtaskstatusesController";
import { TaskmanagementQaTaskmanagementtaskstatusesController } from "./controllers/taskManagement/qa/taskManagementTaskStatuses/TaskmanagementQaTaskmanagementtaskstatusesController";
import { TaskmanagementPmoTaskmanagementprioritiesController } from "./controllers/taskManagement/pmo/taskManagementPriorities/TaskmanagementPmoTaskmanagementprioritiesController";
import { TaskmanagementTpmTaskmanagementprioritiesController } from "./controllers/taskManagement/tpm/taskManagementPriorities/TaskmanagementTpmTaskmanagementprioritiesController";
import { TaskmanagementPmoTaskmanagementTpmsController } from "./controllers/taskManagement/pmo/taskManagement/tpms/TaskmanagementPmoTaskmanagementTpmsController";
import { TaskmanagementTpmTaskmanagementTpmsController } from "./controllers/taskManagement/tpm/taskManagement/tpms/TaskmanagementTpmTaskmanagementTpmsController";
import { TaskmanagementPmTaskmanagementTpmsController } from "./controllers/taskManagement/pm/taskManagement/tpms/TaskmanagementPmTaskmanagementTpmsController";
import { TaskmanagementPmTaskmanagementPmsController } from "./controllers/taskManagement/pm/taskManagement/pms/TaskmanagementPmTaskmanagementPmsController";
import { TaskmanagementPmoTaskmanagementPmosController } from "./controllers/taskManagement/pmo/taskManagement/pmos/TaskmanagementPmoTaskmanagementPmosController";
import { TaskmanagementDeveloperTaskmanagementDevelopersController } from "./controllers/taskManagement/developer/taskManagement/developers/TaskmanagementDeveloperTaskmanagementDevelopersController";
import { TaskmanagementTpmTaskmanagementDevelopersController } from "./controllers/taskManagement/tpm/taskManagement/developers/TaskmanagementTpmTaskmanagementDevelopersController";
import { TaskmanagementPmTaskmanagementDevelopersController } from "./controllers/taskManagement/pm/taskManagement/developers/TaskmanagementPmTaskmanagementDevelopersController";
import { TaskmanagementPmoTaskmanagementDevelopersController } from "./controllers/taskManagement/pmo/taskManagement/developers/TaskmanagementPmoTaskmanagementDevelopersController";
import { TaskmanagementTpmTaskmanagementDesignersController } from "./controllers/taskManagement/tpm/taskManagement/designers/TaskmanagementTpmTaskmanagementDesignersController";
import { TaskmanagementPmTaskmanagementDesignersController } from "./controllers/taskManagement/pm/taskManagement/designers/TaskmanagementPmTaskmanagementDesignersController";
import { TaskmanagementPmoTaskmanagementDesignersController } from "./controllers/taskManagement/pmo/taskManagement/designers/TaskmanagementPmoTaskmanagementDesignersController";
import { TaskmanagementDeveloperTaskmanagementDesignersController } from "./controllers/taskManagement/developer/taskManagement/designers/TaskmanagementDeveloperTaskmanagementDesignersController";
import { TaskmanagementDesignerTaskmanagementDesignersController } from "./controllers/taskManagement/designer/taskManagement/designers/TaskmanagementDesignerTaskmanagementDesignersController";
import { TaskmanagementQaTaskmanagementDesignersController } from "./controllers/taskManagement/qa/taskManagement/designers/TaskmanagementQaTaskmanagementDesignersController";
import { TaskmanagementTpmTaskmanagementQasController } from "./controllers/taskManagement/tpm/taskManagement/qas/TaskmanagementTpmTaskmanagementQasController";
import { TaskmanagementPmTaskmanagementQasController } from "./controllers/taskManagement/pm/taskManagement/qas/TaskmanagementPmTaskmanagementQasController";
import { TaskmanagementPmoTaskmanagementQasController } from "./controllers/taskManagement/pmo/taskManagement/qas/TaskmanagementPmoTaskmanagementQasController";
import { TaskmanagementQaTaskmanagementQasController } from "./controllers/taskManagement/qa/taskManagement/qas/TaskmanagementQaTaskmanagementQasController";
import { TaskmanagementTpmTasksController } from "./controllers/taskManagement/tpm/tasks/TaskmanagementTpmTasksController";
import { TaskmanagementPmTasksController } from "./controllers/taskManagement/pm/tasks/TaskmanagementPmTasksController";
import { TaskmanagementPmoTasksController } from "./controllers/taskManagement/pmo/tasks/TaskmanagementPmoTasksController";
import { TaskmanagementDeveloperTasksController } from "./controllers/taskManagement/developer/tasks/TaskmanagementDeveloperTasksController";
import { TaskmanagementDesignerTasksController } from "./controllers/taskManagement/designer/tasks/TaskmanagementDesignerTasksController";
import { TaskmanagementQaTasksController } from "./controllers/taskManagement/qa/tasks/TaskmanagementQaTasksController";
import { TaskmanagementTpmTasksAssignmentsController } from "./controllers/taskManagement/tpm/tasks/assignments/TaskmanagementTpmTasksAssignmentsController";
import { TaskmanagementPmTasksAssignmentsController } from "./controllers/taskManagement/pm/tasks/assignments/TaskmanagementPmTasksAssignmentsController";
import { TaskmanagementPmoTasksAssignmentsController } from "./controllers/taskManagement/pmo/tasks/assignments/TaskmanagementPmoTasksAssignmentsController";
import { TaskmanagementDeveloperTasksAssignmentsController } from "./controllers/taskManagement/developer/tasks/assignments/TaskmanagementDeveloperTasksAssignmentsController";
import { TaskmanagementDesignerTasksAssignmentsController } from "./controllers/taskManagement/designer/tasks/assignments/TaskmanagementDesignerTasksAssignmentsController";
import { TaskmanagementQaTasksAssignmentsController } from "./controllers/taskManagement/qa/tasks/assignments/TaskmanagementQaTasksAssignmentsController";
import { TaskmanagementTpmTasksCommentsController } from "./controllers/taskManagement/tpm/tasks/comments/TaskmanagementTpmTasksCommentsController";
import { TaskmanagementPmTasksCommentsController } from "./controllers/taskManagement/pm/tasks/comments/TaskmanagementPmTasksCommentsController";
import { TaskmanagementPmoTasksCommentsController } from "./controllers/taskManagement/pmo/tasks/comments/TaskmanagementPmoTasksCommentsController";
import { TaskmanagementDeveloperTasksCommentsController } from "./controllers/taskManagement/developer/tasks/comments/TaskmanagementDeveloperTasksCommentsController";
import { TaskmanagementDesignerTasksCommentsController } from "./controllers/taskManagement/designer/tasks/comments/TaskmanagementDesignerTasksCommentsController";
import { TaskmanagementQaTasksCommentsController } from "./controllers/taskManagement/qa/tasks/comments/TaskmanagementQaTasksCommentsController";
import { TaskmanagementTpmTasksStatuschangesController } from "./controllers/taskManagement/tpm/tasks/statusChanges/TaskmanagementTpmTasksStatuschangesController";
import { TaskmanagementPmTasksStatuschangesController } from "./controllers/taskManagement/pm/tasks/statusChanges/TaskmanagementPmTasksStatuschangesController";
import { TaskmanagementPmoTasksStatuschangesController } from "./controllers/taskManagement/pmo/tasks/statusChanges/TaskmanagementPmoTasksStatuschangesController";
import { TaskmanagementDeveloperTasksStatuschangesController } from "./controllers/taskManagement/developer/tasks/statusChanges/TaskmanagementDeveloperTasksStatuschangesController";
import { TaskmanagementDesignerTasksStatuschangesController } from "./controllers/taskManagement/designer/tasks/statusChanges/TaskmanagementDesignerTasksStatuschangesController";
import { TaskmanagementQaTasksStatuschangesController } from "./controllers/taskManagement/qa/tasks/statusChanges/TaskmanagementQaTasksStatuschangesController";
import { TaskmanagementTpmProjectsController } from "./controllers/taskManagement/tpm/projects/TaskmanagementTpmProjectsController";
import { TaskmanagementPmProjectsController } from "./controllers/taskManagement/pm/projects/TaskmanagementPmProjectsController";
import { TaskmanagementPmoProjectsController } from "./controllers/taskManagement/pmo/projects/TaskmanagementPmoProjectsController";
import { TaskmanagementDeveloperProjectsController } from "./controllers/taskManagement/developer/projects/TaskmanagementDeveloperProjectsController";
import { TaskmanagementDesignerProjectsController } from "./controllers/taskManagement/designer/projects/TaskmanagementDesignerProjectsController";
import { TaskmanagementQaProjectsController } from "./controllers/taskManagement/qa/projects/TaskmanagementQaProjectsController";
import { TaskmanagementTpmProjectsBoardsController } from "./controllers/taskManagement/tpm/projects/boards/TaskmanagementTpmProjectsBoardsController";
import { TaskmanagementPmProjectsBoardsController } from "./controllers/taskManagement/pm/projects/boards/TaskmanagementPmProjectsBoardsController";
import { TaskmanagementPmoProjectsBoardsController } from "./controllers/taskManagement/pmo/projects/boards/TaskmanagementPmoProjectsBoardsController";
import { TaskmanagementTpmBoardsMembersController } from "./controllers/taskManagement/tpm/boards/members/TaskmanagementTpmBoardsMembersController";
import { TaskmanagementPmoBoardsMembersController } from "./controllers/taskManagement/pmo/boards/members/TaskmanagementPmoBoardsMembersController";
import { TaskmanagementPmBoardsMembersController } from "./controllers/taskManagement/pm/boards/members/TaskmanagementPmBoardsMembersController";
import { TaskmanagementDeveloperBoardsMembersController } from "./controllers/taskManagement/developer/boards/members/TaskmanagementDeveloperBoardsMembersController";
import { TaskmanagementDesignerBoardsMembersController } from "./controllers/taskManagement/designer/boards/members/TaskmanagementDesignerBoardsMembersController";
import { TaskmanagementQaBoardsMembersController } from "./controllers/taskManagement/qa/boards/members/TaskmanagementQaBoardsMembersController";
import { TaskmanagementTpmProjectsMembersController } from "./controllers/taskManagement/tpm/projects/members/TaskmanagementTpmProjectsMembersController";
import { TaskmanagementPmProjectsMembersController } from "./controllers/taskManagement/pm/projects/members/TaskmanagementPmProjectsMembersController";
import { TaskmanagementPmoProjectsMembersController } from "./controllers/taskManagement/pmo/projects/members/TaskmanagementPmoProjectsMembersController";
import { TaskmanagementTpmNotificationsController } from "./controllers/taskManagement/tpm/notifications/TaskmanagementTpmNotificationsController";
import { TaskmanagementPmNotificationsController } from "./controllers/taskManagement/pm/notifications/TaskmanagementPmNotificationsController";
import { TaskmanagementPmoNotificationsController } from "./controllers/taskManagement/pmo/notifications/TaskmanagementPmoNotificationsController";
import { TaskmanagementDeveloperNotificationsController } from "./controllers/taskManagement/developer/notifications/TaskmanagementDeveloperNotificationsController";
import { TaskmanagementDesignerNotificationsController } from "./controllers/taskManagement/designer/notifications/TaskmanagementDesignerNotificationsController";
import { TaskmanagementQaNotificationsController } from "./controllers/taskManagement/qa/notifications/TaskmanagementQaNotificationsController";
import { TaskmanagementTpmNotificationpreferencesController } from "./controllers/taskManagement/tpm/notificationPreferences/TaskmanagementTpmNotificationpreferencesController";
import { TaskmanagementPmNotificationpreferencesController } from "./controllers/taskManagement/pm/notificationPreferences/TaskmanagementPmNotificationpreferencesController";
import { TaskmanagementPmoNotificationpreferencesController } from "./controllers/taskManagement/pmo/notificationPreferences/TaskmanagementPmoNotificationpreferencesController";
import { TaskmanagementDeveloperNotificationpreferencesController } from "./controllers/taskManagement/developer/notificationPreferences/TaskmanagementDeveloperNotificationpreferencesController";
import { TaskmanagementDesignerNotificationpreferencesController } from "./controllers/taskManagement/designer/notificationPreferences/TaskmanagementDesignerNotificationpreferencesController";
import { TaskmanagementQaNotificationpreferencesController } from "./controllers/taskManagement/qa/notificationPreferences/TaskmanagementQaNotificationpreferencesController";

@Module({
  controllers: [
    AuthTpmController,
    AuthPmController,
    AuthPmoController,
    AuthDeveloperController,
    AuthDesignerController,
    AuthQaController,
    TaskmanagementTpmTaskmanagementrolesController,
    TaskmanagementPmTaskmanagementrolesController,
    TaskmanagementPmoTaskmanagementrolesController,
    TaskmanagementTpmTaskmanagementtaskstatusesController,
    TaskmanagementPmTaskmanagementtaskstatusesController,
    TaskmanagementPmoTaskmanagementtaskstatusesController,
    TaskmanagementDeveloperTaskmanagementtaskstatusesController,
    TaskmanagementDesignerTaskmanagementtaskstatusesController,
    TaskmanagementQaTaskmanagementtaskstatusesController,
    TaskmanagementPmoTaskmanagementprioritiesController,
    TaskmanagementTpmTaskmanagementprioritiesController,
    TaskmanagementPmoTaskmanagementTpmsController,
    TaskmanagementTpmTaskmanagementTpmsController,
    TaskmanagementPmTaskmanagementTpmsController,
    TaskmanagementPmTaskmanagementPmsController,
    TaskmanagementPmoTaskmanagementPmosController,
    TaskmanagementDeveloperTaskmanagementDevelopersController,
    TaskmanagementTpmTaskmanagementDevelopersController,
    TaskmanagementPmTaskmanagementDevelopersController,
    TaskmanagementPmoTaskmanagementDevelopersController,
    TaskmanagementTpmTaskmanagementDesignersController,
    TaskmanagementPmTaskmanagementDesignersController,
    TaskmanagementPmoTaskmanagementDesignersController,
    TaskmanagementDeveloperTaskmanagementDesignersController,
    TaskmanagementDesignerTaskmanagementDesignersController,
    TaskmanagementQaTaskmanagementDesignersController,
    TaskmanagementTpmTaskmanagementQasController,
    TaskmanagementPmTaskmanagementQasController,
    TaskmanagementPmoTaskmanagementQasController,
    TaskmanagementQaTaskmanagementQasController,
    TaskmanagementTpmTasksController,
    TaskmanagementPmTasksController,
    TaskmanagementPmoTasksController,
    TaskmanagementDeveloperTasksController,
    TaskmanagementDesignerTasksController,
    TaskmanagementQaTasksController,
    TaskmanagementTpmTasksAssignmentsController,
    TaskmanagementPmTasksAssignmentsController,
    TaskmanagementPmoTasksAssignmentsController,
    TaskmanagementDeveloperTasksAssignmentsController,
    TaskmanagementDesignerTasksAssignmentsController,
    TaskmanagementQaTasksAssignmentsController,
    TaskmanagementTpmTasksCommentsController,
    TaskmanagementPmTasksCommentsController,
    TaskmanagementPmoTasksCommentsController,
    TaskmanagementDeveloperTasksCommentsController,
    TaskmanagementDesignerTasksCommentsController,
    TaskmanagementQaTasksCommentsController,
    TaskmanagementTpmTasksStatuschangesController,
    TaskmanagementPmTasksStatuschangesController,
    TaskmanagementPmoTasksStatuschangesController,
    TaskmanagementDeveloperTasksStatuschangesController,
    TaskmanagementDesignerTasksStatuschangesController,
    TaskmanagementQaTasksStatuschangesController,
    TaskmanagementTpmProjectsController,
    TaskmanagementPmProjectsController,
    TaskmanagementPmoProjectsController,
    TaskmanagementDeveloperProjectsController,
    TaskmanagementDesignerProjectsController,
    TaskmanagementQaProjectsController,
    TaskmanagementTpmProjectsBoardsController,
    TaskmanagementPmProjectsBoardsController,
    TaskmanagementPmoProjectsBoardsController,
    TaskmanagementTpmBoardsMembersController,
    TaskmanagementPmoBoardsMembersController,
    TaskmanagementPmBoardsMembersController,
    TaskmanagementDeveloperBoardsMembersController,
    TaskmanagementDesignerBoardsMembersController,
    TaskmanagementQaBoardsMembersController,
    TaskmanagementTpmProjectsMembersController,
    TaskmanagementPmProjectsMembersController,
    TaskmanagementPmoProjectsMembersController,
    TaskmanagementTpmNotificationsController,
    TaskmanagementPmNotificationsController,
    TaskmanagementPmoNotificationsController,
    TaskmanagementDeveloperNotificationsController,
    TaskmanagementDesignerNotificationsController,
    TaskmanagementQaNotificationsController,
    TaskmanagementTpmNotificationpreferencesController,
    TaskmanagementPmNotificationpreferencesController,
    TaskmanagementPmoNotificationpreferencesController,
    TaskmanagementDeveloperNotificationpreferencesController,
    TaskmanagementDesignerNotificationpreferencesController,
    TaskmanagementQaNotificationpreferencesController,
  ],
})
export class MyModule {}
