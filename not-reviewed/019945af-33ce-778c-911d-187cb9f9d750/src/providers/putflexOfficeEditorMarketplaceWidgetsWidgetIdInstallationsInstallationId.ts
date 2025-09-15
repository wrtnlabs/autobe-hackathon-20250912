import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing widget installation for a marketplace widget.
 *
 * This operation updates the properties of an existing widget installation
 * identified by installationId under a given marketplace widget widgetId. It
 * modifies configuration and date details as needed. Only authenticated editors
 * with proper permissions are authorized to perform this operation.
 *
 * @param props - Object containing editor authentication, widget and
 *   installation identifiers, and update data
 * @param props.editor - Authenticated editor payload
 * @param props.widgetId - UUID of the target marketplace widget
 * @param props.installationId - UUID of the widget installation to update
 * @param props.body - Partial update data for the widget installation
 * @returns The updated widget installation record with all fields
 * @throws {Error} When the installation record does not exist or update fails
 */
export async function putflexOfficeEditorMarketplaceWidgetsWidgetIdInstallationsInstallationId(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  installationId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetInstallation.IUpdate;
}): Promise<IFlexOfficeWidgetInstallation> {
  const { editor, widgetId, installationId, body } = props;

  const now = toISOStringSafe(new Date());

  // Update the widget installation with provided fields
  const updated = await MyGlobal.prisma.flex_office_widget_installations.update(
    {
      where: {
        id: installationId,
        marketplace_widget_id: widgetId,
      },
      data: {
        ...(body.marketplace_widget_id !== undefined
          ? { marketplace_widget_id: body.marketplace_widget_id }
          : {}),
        ...(body.page_id !== undefined ? { page_id: body.page_id } : {}),
        ...(body.installation_date !== undefined
          ? { installation_date: body.installation_date }
          : {}),
        configuration_data: body.configuration_data ?? undefined,
        updated_at: now,
      },
    },
  );

  // Normalize and return the updated record
  return {
    id: updated.id,
    marketplace_widget_id: updated.marketplace_widget_id,
    page_id: updated.page_id,
    installation_date: toISOStringSafe(updated.installation_date),
    configuration_data: updated.configuration_data ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
