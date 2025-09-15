import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieves detailed information of a single marketplace widget identified by
 * its UUID.
 *
 * This endpoint is accessible only to authenticated users with editor or admin
 * roles. It fetches the full widget entity including code, name, version,
 * description, and timestamps.
 *
 * @param props - Object containing the authenticated editor and the widget ID.
 * @param props.editor - The authenticated editor payload.
 * @param props.id - UUID of the marketplace widget to retrieve.
 * @returns The marketplace widget details.
 * @throws {Error} Throws if the widget does not exist.
 */
export async function getflexOfficeEditorMarketplaceWidgetsId(props: {
  editor: EditorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeMarketplaceWidget> {
  const { id } = props;
  const widget =
    await MyGlobal.prisma.flex_office_marketplace_widgets.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: widget.id,
    widget_code: widget.widget_code,
    name: widget.name,
    version: widget.version,
    description: widget.description ?? null,
    created_at: toISOStringSafe(widget.created_at),
    updated_at: toISOStringSafe(widget.updated_at),
    deleted_at: widget.deleted_at ? toISOStringSafe(widget.deleted_at) : null,
  };
}
