import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing widget by pageId and widgetId.
 *
 * This operation updates widget properties for a specific UI widget on a UI
 * page. It ensures name uniqueness within the page and requires widget_type
 * presence if updated.
 *
 * Authorization: Only editors or admins allowed (editor payload provided).
 *
 * @param props - Object containing editor payload, pageId, widgetId, and update
 *   body
 * @returns The updated widget entity reflecting new data
 * @throws {Error} Widget not found for given ids
 * @throws {Error} Widget name duplication within the page
 * @throws {Error} Widget_type missing or null when updated
 */
export async function putflexOfficeEditorPagesPageIdWidgetsWidgetId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidget.IUpdate;
}): Promise<IFlexOfficeWidget> {
  const { editor, pageId, widgetId, body } = props;

  const existingWidget = await MyGlobal.prisma.flex_office_widgets.findFirst({
    where: {
      id: widgetId,
      flex_office_page_id: pageId,
      deleted_at: null,
    },
  });

  if (!existingWidget) throw new Error("Widget not found");

  if (body.name !== undefined && body.name !== existingWidget.name) {
    const duplicateName = await MyGlobal.prisma.flex_office_widgets.findFirst({
      where: {
        flex_office_page_id: pageId,
        name: body.name,
        id: { not: widgetId },
        deleted_at: null,
      },
    });

    if (duplicateName) {
      throw new Error("Widget name must be unique within the page");
    }
  }

  if (body.widget_type !== undefined && body.widget_type === null) {
    throw new Error("widget_type is required and cannot be null");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.flex_office_widgets.update({
    where: {
      id: widgetId,
    },
    data: {
      ...(body.flex_office_page_id !== undefined && {
        flex_office_page_id: body.flex_office_page_id,
      }),
      ...(body.widget_type !== undefined &&
        body.widget_type !== null && { widget_type: body.widget_type }),
      ...(body.name !== undefined && { name: body.name }),
      configuration: body.configuration ?? null,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    flex_office_page_id: updated.flex_office_page_id,
    widget_type: updated.widget_type,
    name: updated.name,
    configuration: updated.configuration ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
