import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieves detailed information of a specific widget installation identified
 * by the marketplace widget UUID and the installation UUID. For editor and
 * admin roles only.
 *
 * @param props - Object containing editor authentication and path parameters
 * @param props.editor - Authenticated editor making the request
 * @param props.widgetId - UUID of the marketplace widget
 * @param props.installationId - UUID of the specific widget installation
 * @returns Detailed widget installation including configuration and timestamps
 * @throws {Error} If no matching installation is found
 */
export async function getflexOfficeEditorMarketplaceWidgetsWidgetIdInstallationsInstallationId(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  installationId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeWidgetInstallation> {
  const { widgetId, installationId } = props;

  const record =
    await MyGlobal.prisma.flex_office_widget_installations.findFirstOrThrow({
      where: {
        id: installationId,
        marketplace_widget_id: widgetId,
      },
    });

  return {
    id: record.id,
    marketplace_widget_id: record.marketplace_widget_id,
    page_id: record.page_id,
    installation_date: toISOStringSafe(record.installation_date),
    configuration_data: record.configuration_data ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
