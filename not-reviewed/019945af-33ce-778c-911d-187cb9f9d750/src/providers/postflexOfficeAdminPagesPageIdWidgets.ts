import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new widget in a specified UI page.
 *
 * This operation creates a new flex_office_widgets record linked to the given
 * pageId with the properties provided in the body. It verifies that the widget
 * name does not already exist on that page (active widgets). Timestamps are
 * generated on creation.
 *
 * @param props - Operation parameters
 * @param props.admin - Authenticated admin user creating the widget
 * @param props.pageId - UUID of the target UI page
 * @param props.body - Widget creation data conforming to
 *   IFlexOfficeWidget.ICreate
 * @returns The created IFlexOfficeWidget entity
 * @throws {Error} If a widget with the same name already exists on the page
 */
export async function postflexOfficeAdminPagesPageIdWidgets(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidget.ICreate;
}): Promise<IFlexOfficeWidget> {
  const { admin, pageId, body } = props;

  const existingWidget = await MyGlobal.prisma.flex_office_widgets.findFirst({
    where: {
      flex_office_page_id: pageId,
      name: body.name,
      deleted_at: null,
    },
  });

  if (existingWidget) {
    throw new Error(
      `Widget with name '${body.name}' already exists on the specified page.`,
    );
  }

  const now = toISOStringSafe(new Date());
  const newWidgetId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_widgets.create({
    data: {
      id: newWidgetId,
      flex_office_page_id: pageId,
      widget_type: body.widget_type,
      name: body.name,
      configuration: body.configuration ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    flex_office_page_id: created.flex_office_page_id,
    widget_type: created.widget_type,
    name: created.name,
    configuration: created.configuration ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
