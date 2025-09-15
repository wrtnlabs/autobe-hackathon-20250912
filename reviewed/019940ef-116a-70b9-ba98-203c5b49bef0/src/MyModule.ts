import { Module } from "@nestjs/common";

import { AuthEmployeeJoinController } from "./controllers/auth/employee/join/AuthEmployeeJoinController";
import { AuthEmployeeLoginController } from "./controllers/auth/employee/login/AuthEmployeeLoginController";
import { AuthEmployeeRefreshController } from "./controllers/auth/employee/refresh/AuthEmployeeRefreshController";
import { AuthManagerController } from "./controllers/auth/manager/AuthManagerController";
import { JobperformanceevalManagerEvaluationcyclesController } from "./controllers/jobPerformanceEval/manager/evaluationCycles/JobperformanceevalManagerEvaluationcyclesController";
import { JobperformanceevalManagerSystemsettingsController } from "./controllers/jobPerformanceEval/manager/systemSettings/JobperformanceevalManagerSystemsettingsController";
import { JobperformanceevalManagerEmployeesController } from "./controllers/jobPerformanceEval/manager/employees/JobperformanceevalManagerEmployeesController";
import { JobperformanceevalEmployeeEmployeesController } from "./controllers/jobPerformanceEval/employee/employees/JobperformanceevalEmployeeEmployeesController";
import { JobperformanceevalManagerManagersController } from "./controllers/jobPerformanceEval/manager/managers/JobperformanceevalManagerManagersController";
import { JobperformanceevalEmployeeManagersController } from "./controllers/jobPerformanceEval/employee/managers/JobperformanceevalEmployeeManagersController";
import { JobperformanceevalEmployeeJobgroupsController } from "./controllers/jobPerformanceEval/employee/jobGroups/JobperformanceevalEmployeeJobgroupsController";
import { JobperformanceevalManagerJobgroupsController } from "./controllers/jobPerformanceEval/manager/jobGroups/JobperformanceevalManagerJobgroupsController";
import { JobperformanceevalEmployeeJobgroupsJobseriesController } from "./controllers/jobPerformanceEval/employee/jobGroups/jobSeries/JobperformanceevalEmployeeJobgroupsJobseriesController";
import { JobperformanceevalManagerJobgroupsJobseriesController } from "./controllers/jobPerformanceEval/manager/jobGroups/jobSeries/JobperformanceevalManagerJobgroupsJobseriesController";
import { JobperformanceevalEmployeeJobseriesJobrolesController } from "./controllers/jobPerformanceEval/employee/jobSeries/jobRoles/JobperformanceevalEmployeeJobseriesJobrolesController";
import { JobperformanceevalManagerJobseriesJobrolesController } from "./controllers/jobPerformanceEval/manager/jobSeries/jobRoles/JobperformanceevalManagerJobseriesJobrolesController";
import { JobperformanceevalEmployeeJobrolesTaskgroupsController } from "./controllers/jobPerformanceEval/employee/jobRoles/taskGroups/JobperformanceevalEmployeeJobrolesTaskgroupsController";
import { JobperformanceevalManagerJobrolesTaskgroupsController } from "./controllers/jobPerformanceEval/manager/jobRoles/taskGroups/JobperformanceevalManagerJobrolesTaskgroupsController";
import { JobperformanceevalEmployeeTaskgroupsTasksController } from "./controllers/jobPerformanceEval/employee/taskGroups/tasks/JobperformanceevalEmployeeTaskgroupsTasksController";
import { JobperformanceevalManagerTaskgroupsTasksController } from "./controllers/jobPerformanceEval/manager/taskGroups/tasks/JobperformanceevalManagerTaskgroupsTasksController";
import { JobperformanceevalEmployeeTasksTaskactivitiesController } from "./controllers/jobPerformanceEval/employee/tasks/taskActivities/JobperformanceevalEmployeeTasksTaskactivitiesController";
import { JobperformanceevalManagerTasksTaskactivitiesController } from "./controllers/jobPerformanceEval/manager/tasks/taskActivities/JobperformanceevalManagerTasksTaskactivitiesController";
import { JobperformanceevalEmployeeKnowledgeareasController } from "./controllers/jobPerformanceEval/employee/knowledgeAreas/JobperformanceevalEmployeeKnowledgeareasController";
import { JobperformanceevalManagerKnowledgeareasController } from "./controllers/jobPerformanceEval/manager/knowledgeAreas/JobperformanceevalManagerKnowledgeareasController";
import { JobperformanceevalEmployeeSelfevaluationsController } from "./controllers/jobPerformanceEval/employee/selfEvaluations/JobperformanceevalEmployeeSelfevaluationsController";
import { JobperformanceevalManagerSelfevaluationsController } from "./controllers/jobPerformanceEval/manager/selfEvaluations/JobperformanceevalManagerSelfevaluationsController";
import { JobperformanceevalManagerManagerevaluationsController } from "./controllers/jobPerformanceEval/manager/managerEvaluations/JobperformanceevalManagerManagerevaluationsController";
import { JobperformanceevalEmployeeEvaluationscoresController } from "./controllers/jobPerformanceEval/employee/evaluationScores/JobperformanceevalEmployeeEvaluationscoresController";
import { JobperformanceevalManagerEvaluationscoresController } from "./controllers/jobPerformanceEval/manager/evaluationScores/JobperformanceevalManagerEvaluationscoresController";
import { JobperformanceevalEmployeeEmployeecommentsController } from "./controllers/jobPerformanceEval/employee/employeeComments/JobperformanceevalEmployeeEmployeecommentsController";
import { JobperformanceevalManagerEmployeecommentsController } from "./controllers/jobPerformanceEval/manager/employeeComments/JobperformanceevalManagerEmployeecommentsController";
import { JobperformanceevalManagerManagercommentsController } from "./controllers/jobPerformanceEval/manager/managerComments/JobperformanceevalManagerManagercommentsController";
import { JobperformanceevalManagerEvaluationsnapshotsController } from "./controllers/jobPerformanceEval/manager/evaluationSnapshots/JobperformanceevalManagerEvaluationsnapshotsController";
import { JobperformanceevalEmployeeEvaluationsnapshotsController } from "./controllers/jobPerformanceEval/employee/evaluationSnapshots/JobperformanceevalEmployeeEvaluationsnapshotsController";
import { JobperformanceevalEmployeeTeamstatisticsController } from "./controllers/jobPerformanceEval/employee/teamStatistics/JobperformanceevalEmployeeTeamstatisticsController";
import { JobperformanceevalManagerTeamstatisticsController } from "./controllers/jobPerformanceEval/manager/teamStatistics/JobperformanceevalManagerTeamstatisticsController";

@Module({
  controllers: [
    AuthEmployeeJoinController,
    AuthEmployeeLoginController,
    AuthEmployeeRefreshController,
    AuthManagerController,
    JobperformanceevalManagerEvaluationcyclesController,
    JobperformanceevalManagerSystemsettingsController,
    JobperformanceevalManagerEmployeesController,
    JobperformanceevalEmployeeEmployeesController,
    JobperformanceevalManagerManagersController,
    JobperformanceevalEmployeeManagersController,
    JobperformanceevalEmployeeJobgroupsController,
    JobperformanceevalManagerJobgroupsController,
    JobperformanceevalEmployeeJobgroupsJobseriesController,
    JobperformanceevalManagerJobgroupsJobseriesController,
    JobperformanceevalEmployeeJobseriesJobrolesController,
    JobperformanceevalManagerJobseriesJobrolesController,
    JobperformanceevalEmployeeJobrolesTaskgroupsController,
    JobperformanceevalManagerJobrolesTaskgroupsController,
    JobperformanceevalEmployeeTaskgroupsTasksController,
    JobperformanceevalManagerTaskgroupsTasksController,
    JobperformanceevalEmployeeTasksTaskactivitiesController,
    JobperformanceevalManagerTasksTaskactivitiesController,
    JobperformanceevalEmployeeKnowledgeareasController,
    JobperformanceevalManagerKnowledgeareasController,
    JobperformanceevalEmployeeSelfevaluationsController,
    JobperformanceevalManagerSelfevaluationsController,
    JobperformanceevalManagerManagerevaluationsController,
    JobperformanceevalEmployeeEvaluationscoresController,
    JobperformanceevalManagerEvaluationscoresController,
    JobperformanceevalEmployeeEmployeecommentsController,
    JobperformanceevalManagerEmployeecommentsController,
    JobperformanceevalManagerManagercommentsController,
    JobperformanceevalManagerEvaluationsnapshotsController,
    JobperformanceevalEmployeeEvaluationsnapshotsController,
    JobperformanceevalEmployeeTeamstatisticsController,
    JobperformanceevalManagerTeamstatisticsController,
  ],
})
export class MyModule {}
