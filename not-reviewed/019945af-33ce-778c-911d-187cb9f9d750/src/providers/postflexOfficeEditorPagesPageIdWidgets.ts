import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new widget in a UI page
 *
 * This operation creates a new widget on a specified UI page using the provided
 * widget properties. Only authenticated users with the 'editor' role can
 * perform this creation.
 *
 * @param props - Object containing the authenticated editor payload, page ID,
 *   and widget creation body.
 * @param props.editor - The authenticated editor payload
 * @param props.pageId - The UUID of the UI page where the widget will be added
 * @param props.body - Widget creation data conforming to
 *   IFlexOfficeWidget.ICreate
 * @returns The newly created widget including all persistent fields
 * @throws Error if database constraints are violated (e.g., duplicate widget
 *   name)
 */
export async function postflexOfficeEditorPagesPageIdWidgets(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidget.ICreate;
}): Promise<IFlexOfficeWidget> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.flex_office_widgets.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      flex_office_page_id: props.pageId,
      widget_type: props.body.widget_type,
      name: props.body.name,
      configuration: props.body.configuration ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    flex_office_page_id: created.flex_office_page_id as string &
      tags.Format<"uuid">,
    widget_type: created.widget_type,
    name: created.name,
    configuration: created.configuration ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
