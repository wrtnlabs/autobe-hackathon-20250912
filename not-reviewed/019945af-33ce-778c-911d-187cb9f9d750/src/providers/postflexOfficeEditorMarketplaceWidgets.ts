import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Creates a new marketplace widget in the FlexOffice system.
 *
 * This endpoint allows an authenticated editor user to add a new widget to the
 * marketplace. The widget code must be unique. Optional description may be
 * provided. Timestamps and UUIDs are generated server-side.
 *
 * @param props - Object containing the authenticated editor and creation data
 * @param props.editor - The authenticated editor user creating the widget
 * @param props.body - The input data for creating the marketplace widget
 * @returns The newly created marketplace widget entity with all fields
 *   populated
 * @throws {Error} If widget_code violates uniqueness constraint or database
 *   error occurs
 */
export async function postflexOfficeEditorMarketplaceWidgets(props: {
  editor: EditorPayload;
  body: IFlexOfficeMarketplaceWidget.ICreate;
}): Promise<IFlexOfficeMarketplaceWidget> {
  const { editor, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as unknown as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_marketplace_widgets.create({
    data: {
      id: id,
      widget_code: body.widget_code,
      name: body.name,
      version: body.version,
      description: body.description ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as unknown as string & tags.Format<"uuid">,
    widget_code: created.widget_code,
    name: created.name,
    version: created.version,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
