import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information of a specific widget installation identified
 * by the marketplace widget UUID and the installation UUID. Access restricted
 * to admin role only.
 *
 * @param props - Object containing admin payload and path parameters widgetId
 *   and installationId
 * @param props.admin - The authenticated admin making the request
 * @param props.widgetId - Unique identifier of the marketplace widget
 * @param props.installationId - Unique identifier of the widget installation
 * @returns Detailed widget installation information conforming to
 *   IFlexOfficeWidgetInstallation
 * @throws {Error} When no matching installation is found
 */
export async function getflexOfficeAdminMarketplaceWidgetsWidgetIdInstallationsInstallationId(props: {
  admin: AdminPayload;
  widgetId: string & tags.Format<"uuid">;
  installationId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeWidgetInstallation> {
  const { admin, widgetId, installationId } = props;

  const installation =
    await MyGlobal.prisma.flex_office_widget_installations.findFirst({
      where: {
        id: installationId,
        marketplace_widget_id: widgetId,
      },
    });

  if (!installation) {
    throw new Error("Installation not found");
  }

  return {
    id: installation.id,
    marketplace_widget_id: installation.marketplace_widget_id,
    page_id: installation.page_id,
    installation_date: toISOStringSafe(installation.installation_date),
    configuration_data: installation.configuration_data ?? null,
    created_at: toISOStringSafe(installation.created_at),
    updated_at: toISOStringSafe(installation.updated_at),
    deleted_at: installation.deleted_at
      ? toISOStringSafe(installation.deleted_at)
      : null,
  };
}
