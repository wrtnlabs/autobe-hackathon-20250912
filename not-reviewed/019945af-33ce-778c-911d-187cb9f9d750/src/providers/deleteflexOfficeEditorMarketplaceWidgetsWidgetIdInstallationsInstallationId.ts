import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Delete a widget installation and disassociate a marketplace widget from a UI
 * page.
 *
 * This operation permanently deletes the widget installation record identified
 * by installationId and ensures it belongs to the specified marketplace widget
 * widgetId.
 *
 * Only authorized editors can perform this deletion.
 *
 * @param props - Object containing editor payload and identifiers
 * @param props.editor - The authenticated editor performing the deletion
 * @param props.widgetId - The UUID of the marketplace widget
 * @param props.installationId - The UUID of the widget installation to delete
 * @returns A promise that resolves when the deletion is complete
 * @throws {Error} Throws if the widget installation does not exist or does not
 *   belong to the widget
 */
export async function deleteflexOfficeEditorMarketplaceWidgetsWidgetIdInstallationsInstallationId(props: {
  editor: EditorPayload;
  widgetId: string & tags.Format<"uuid">;
  installationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, widgetId, installationId } = props;

  const installation =
    await MyGlobal.prisma.flex_office_widget_installations.findFirst({
      where: {
        id: installationId,
        marketplace_widget_id: widgetId,
        deleted_at: null,
      },
    });

  if (!installation) {
    throw new Error("Widget installation not found");
  }

  await MyGlobal.prisma.flex_office_widget_installations.delete({
    where: {
      id: installationId,
    },
  });
}
