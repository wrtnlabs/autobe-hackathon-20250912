import { Module } from "@nestjs/common";

import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthEditorController } from "./controllers/auth/editor/AuthEditorController";
import { AuthViewerController } from "./controllers/auth/viewer/AuthViewerController";
import { FlexofficeAdminSystemsettingsController } from "./controllers/flexOffice/admin/systemSettings/FlexofficeAdminSystemsettingsController";
import { FlexofficeAdminThemesController } from "./controllers/flexOffice/admin/themes/FlexofficeAdminThemesController";
import { FlexofficeEditorThemesController } from "./controllers/flexOffice/editor/themes/FlexofficeEditorThemesController";
import { FlexofficeAdminAdminsController } from "./controllers/flexOffice/admin/admins/FlexofficeAdminAdminsController";
import { FlexofficeAdminEditorsController } from "./controllers/flexOffice/admin/editors/FlexofficeAdminEditorsController";
import { FlexofficeAdminViewersController } from "./controllers/flexOffice/admin/viewers/FlexofficeAdminViewersController";
import { FlexofficeViewerViewersController } from "./controllers/flexOffice/viewer/viewers/FlexofficeViewerViewersController";
import { FlexofficeViewerPagesController } from "./controllers/flexOffice/viewer/pages/FlexofficeViewerPagesController";
import { FlexofficeAdminPagesController } from "./controllers/flexOffice/admin/pages/FlexofficeAdminPagesController";
import { FlexofficeEditorPagesController } from "./controllers/flexOffice/editor/pages/FlexofficeEditorPagesController";
import { FlexofficeAdminPagesWidgetsController } from "./controllers/flexOffice/admin/pages/widgets/FlexofficeAdminPagesWidgetsController";
import { FlexofficeEditorPagesWidgetsController } from "./controllers/flexOffice/editor/pages/widgets/FlexofficeEditorPagesWidgetsController";
import { FlexofficeViewerPagesWidgetsController } from "./controllers/flexOffice/viewer/pages/widgets/FlexofficeViewerPagesWidgetsController";
import { FlexofficeEditorWidgetsScriptsController } from "./controllers/flexOffice/editor/widgets/scripts/FlexofficeEditorWidgetsScriptsController";
import { FlexofficeAdminPagethemesController } from "./controllers/flexOffice/admin/pageThemes/FlexofficeAdminPagethemesController";
import { FlexofficeEditorPagethemesController } from "./controllers/flexOffice/editor/pageThemes/FlexofficeEditorPagethemesController";
import { FlexofficeViewerPagethemesController } from "./controllers/flexOffice/viewer/pageThemes/FlexofficeViewerPagethemesController";
import { FlexofficeAdminWidgetsScriptsController } from "./controllers/flexOffice/admin/widgets/scripts/FlexofficeAdminWidgetsScriptsController";
import { FlexofficeEditorPagesVersionsController } from "./controllers/flexOffice/editor/pages/versions/FlexofficeEditorPagesVersionsController";
import { FlexofficeAdminPagesVersionsController } from "./controllers/flexOffice/admin/pages/versions/FlexofficeAdminPagesVersionsController";
import { FlexofficeAdminDatasourcesController } from "./controllers/flexOffice/admin/dataSources/FlexofficeAdminDatasourcesController";
import { FlexofficeEditorDatasourcesController } from "./controllers/flexOffice/editor/dataSources/FlexofficeEditorDatasourcesController";
import { FlexofficeAdminDatasourcesCredentialsController } from "./controllers/flexOffice/admin/dataSources/credentials/FlexofficeAdminDatasourcesCredentialsController";
import { FlexofficeEditorDatasourcesCredentialsController } from "./controllers/flexOffice/editor/dataSources/credentials/FlexofficeEditorDatasourcesCredentialsController";
import { FlexofficeAdminDatasourcesSyncsController } from "./controllers/flexOffice/admin/dataSources/syncs/FlexofficeAdminDatasourcesSyncsController";
import { FlexofficeEditorDatasourcesSyncsController } from "./controllers/flexOffice/editor/dataSources/syncs/FlexofficeEditorDatasourcesSyncsController";
import { FlexofficeAdminDatasourcesExternalsheetsController } from "./controllers/flexOffice/admin/dataSources/externalSheets/FlexofficeAdminDatasourcesExternalsheetsController";
import { FlexofficeEditorDatasourcesExternalsheetsController } from "./controllers/flexOffice/editor/dataSources/externalSheets/FlexofficeEditorDatasourcesExternalsheetsController";
import { FlexofficeViewerDatasourcesExternalsheetsController } from "./controllers/flexOffice/viewer/dataSources/externalSheets/FlexofficeViewerDatasourcesExternalsheetsController";
import { FlexofficeAdminDatasourcelogsController } from "./controllers/flexOffice/admin/dataSourceLogs/FlexofficeAdminDatasourcelogsController";
import { FlexofficeAdminPageeditorsController } from "./controllers/flexOffice/admin/pageEditors/FlexofficeAdminPageeditorsController";
import { FlexofficeEditorPageeditorsController } from "./controllers/flexOffice/editor/pageEditors/FlexofficeEditorPageeditorsController";
import { FlexofficeEditorPagesPageeditorsController } from "./controllers/flexOffice/editor/pages/pageEditors/FlexofficeEditorPagesPageeditorsController";
import { FlexofficeAdminPagesPageeditorsController } from "./controllers/flexOffice/admin/pages/pageEditors/FlexofficeAdminPagesPageeditorsController";
import { FlexofficeViewerPagecommentsController } from "./controllers/flexOffice/viewer/pageComments/FlexofficeViewerPagecommentsController";
import { FlexofficeEditorPagecommentsController } from "./controllers/flexOffice/editor/pageComments/FlexofficeEditorPagecommentsController";
import { FlexofficeAdminPagecommentsController } from "./controllers/flexOffice/admin/pageComments/FlexofficeAdminPagecommentsController";
import { FlexofficeAdminPagesPagecommentsController } from "./controllers/flexOffice/admin/pages/pageComments/FlexofficeAdminPagesPagecommentsController";
import { FlexofficeEditorPagesPagecommentsController } from "./controllers/flexOffice/editor/pages/pageComments/FlexofficeEditorPagesPagecommentsController";
import { FlexofficeViewerPagesPagecommentsController } from "./controllers/flexOffice/viewer/pages/pageComments/FlexofficeViewerPagesPagecommentsController";
import { FlexofficeEditorEditconflictsController } from "./controllers/flexOffice/editor/editConflicts/FlexofficeEditorEditconflictsController";
import { FlexofficeAdminEditconflictsController } from "./controllers/flexOffice/admin/editConflicts/FlexofficeAdminEditconflictsController";
import { FlexofficeEditorPagesEditconflictsController } from "./controllers/flexOffice/editor/pages/editConflicts/FlexofficeEditorPagesEditconflictsController";
import { FlexofficeEditorChartsController } from "./controllers/flexOffice/editor/charts/FlexofficeEditorChartsController";
import { FlexofficeAdminChartsController } from "./controllers/flexOffice/admin/charts/FlexofficeAdminChartsController";
import { FlexofficeViewerChartsController } from "./controllers/flexOffice/viewer/charts/FlexofficeViewerChartsController";
import { FlexofficeAdminWidgetsKpiController } from "./controllers/flexOffice/admin/widgets/kpi/FlexofficeAdminWidgetsKpiController";
import { FlexofficeEditorWidgetsKpiController } from "./controllers/flexOffice/editor/widgets/kpi/FlexofficeEditorWidgetsKpiController";
import { FlexofficeViewerWidgetsKpiController } from "./controllers/flexOffice/viewer/widgets/kpi/FlexofficeViewerWidgetsKpiController";
import { FlexofficeAdminChartsFilterconditionsController } from "./controllers/flexOffice/admin/charts/filterConditions/FlexofficeAdminChartsFilterconditionsController";
import { FlexofficeEditorChartsFilterconditionsController } from "./controllers/flexOffice/editor/charts/filterConditions/FlexofficeEditorChartsFilterconditionsController";
import { FlexofficeAdminExportlogsController } from "./controllers/flexOffice/admin/exportLogs/FlexofficeAdminExportlogsController";
import { FlexofficeAdminAuditsController } from "./controllers/flexOffice/admin/audits/FlexofficeAdminAuditsController";
import { FlexofficeAdminUseractivitylogsController } from "./controllers/flexOffice/admin/userActivityLogs/FlexofficeAdminUseractivitylogsController";
import { FlexofficeAdminSystemalertsController } from "./controllers/flexOffice/admin/systemAlerts/FlexofficeAdminSystemalertsController";
import { FlexofficeAdminCustomscriptsController } from "./controllers/flexOffice/admin/customScripts/FlexofficeAdminCustomscriptsController";
import { FlexofficeEditorCustomscriptsController } from "./controllers/flexOffice/editor/customScripts/FlexofficeEditorCustomscriptsController";
import { FlexofficeAdminMarketplacewidgetsController } from "./controllers/flexOffice/admin/marketplaceWidgets/FlexofficeAdminMarketplacewidgetsController";
import { FlexofficeEditorMarketplacewidgetsController } from "./controllers/flexOffice/editor/marketplaceWidgets/FlexofficeEditorMarketplacewidgetsController";
import { FlexofficeAdminMarketplacewidgetsInstallationsController } from "./controllers/flexOffice/admin/marketplaceWidgets/installations/FlexofficeAdminMarketplacewidgetsInstallationsController";
import { FlexofficeEditorMarketplacewidgetsInstallationsController } from "./controllers/flexOffice/editor/marketplaceWidgets/installations/FlexofficeEditorMarketplacewidgetsInstallationsController";
import { FlexofficeAdminRoleassignmentsController } from "./controllers/flexOffice/admin/roleAssignments/FlexofficeAdminRoleassignmentsController";
import { FlexofficeAdminPermissionsController } from "./controllers/flexOffice/admin/permissions/FlexofficeAdminPermissionsController";
import { FlexofficeAdminTablepermissionsController } from "./controllers/flexOffice/admin/tablePermissions/FlexofficeAdminTablepermissionsController";
import { FlexofficeAdminTablepermissionsColumnpermissionsController } from "./controllers/flexOffice/admin/tablePermissions/columnPermissions/FlexofficeAdminTablepermissionsColumnpermissionsController";
import { FlexofficeAdminTablepermissionsRowpermissionsController } from "./controllers/flexOffice/admin/tablePermissions/rowPermissions/FlexofficeAdminTablepermissionsRowpermissionsController";

@Module({
  controllers: [
    AuthAdminController,
    AuthEditorController,
    AuthViewerController,
    FlexofficeAdminSystemsettingsController,
    FlexofficeAdminThemesController,
    FlexofficeEditorThemesController,
    FlexofficeAdminAdminsController,
    FlexofficeAdminEditorsController,
    FlexofficeAdminViewersController,
    FlexofficeViewerViewersController,
    FlexofficeViewerPagesController,
    FlexofficeAdminPagesController,
    FlexofficeEditorPagesController,
    FlexofficeAdminPagesWidgetsController,
    FlexofficeEditorPagesWidgetsController,
    FlexofficeViewerPagesWidgetsController,
    FlexofficeEditorWidgetsScriptsController,
    FlexofficeAdminPagethemesController,
    FlexofficeEditorPagethemesController,
    FlexofficeViewerPagethemesController,
    FlexofficeAdminWidgetsScriptsController,
    FlexofficeEditorPagesVersionsController,
    FlexofficeAdminPagesVersionsController,
    FlexofficeAdminDatasourcesController,
    FlexofficeEditorDatasourcesController,
    FlexofficeAdminDatasourcesCredentialsController,
    FlexofficeEditorDatasourcesCredentialsController,
    FlexofficeAdminDatasourcesSyncsController,
    FlexofficeEditorDatasourcesSyncsController,
    FlexofficeAdminDatasourcesExternalsheetsController,
    FlexofficeEditorDatasourcesExternalsheetsController,
    FlexofficeViewerDatasourcesExternalsheetsController,
    FlexofficeAdminDatasourcelogsController,
    FlexofficeAdminPageeditorsController,
    FlexofficeEditorPageeditorsController,
    FlexofficeEditorPagesPageeditorsController,
    FlexofficeAdminPagesPageeditorsController,
    FlexofficeViewerPagecommentsController,
    FlexofficeEditorPagecommentsController,
    FlexofficeAdminPagecommentsController,
    FlexofficeAdminPagesPagecommentsController,
    FlexofficeEditorPagesPagecommentsController,
    FlexofficeViewerPagesPagecommentsController,
    FlexofficeEditorEditconflictsController,
    FlexofficeAdminEditconflictsController,
    FlexofficeEditorPagesEditconflictsController,
    FlexofficeEditorChartsController,
    FlexofficeAdminChartsController,
    FlexofficeViewerChartsController,
    FlexofficeAdminWidgetsKpiController,
    FlexofficeEditorWidgetsKpiController,
    FlexofficeViewerWidgetsKpiController,
    FlexofficeAdminChartsFilterconditionsController,
    FlexofficeEditorChartsFilterconditionsController,
    FlexofficeAdminExportlogsController,
    FlexofficeAdminAuditsController,
    FlexofficeAdminUseractivitylogsController,
    FlexofficeAdminSystemalertsController,
    FlexofficeAdminCustomscriptsController,
    FlexofficeEditorCustomscriptsController,
    FlexofficeAdminMarketplacewidgetsController,
    FlexofficeEditorMarketplacewidgetsController,
    FlexofficeAdminMarketplacewidgetsInstallationsController,
    FlexofficeEditorMarketplacewidgetsInstallationsController,
    FlexofficeAdminRoleassignmentsController,
    FlexofficeAdminPermissionsController,
    FlexofficeAdminTablepermissionsController,
    FlexofficeAdminTablepermissionsColumnpermissionsController,
    FlexofficeAdminTablepermissionsRowpermissionsController,
  ],
})
export class MyModule {}
