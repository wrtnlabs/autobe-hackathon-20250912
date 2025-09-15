import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageVersion";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Get detailed information for a UI page version
 *
 * Retrieves a single UI page version record identified by pageId and versionId.
 * This endpoint returns the full serialized page snapshot including version
 * number, JSON page state, and creation timestamp.
 *
 * @param props - Object containing editor info, pageId, and versionId
 * @param props.editor - Authenticated editor payload
 * @param props.pageId - UUID of the parent UI page
 * @param props.versionId - UUID of the UI page version
 * @returns Details of the specified UI page version conforming to
 *   IFlexOfficePageVersion
 * @throws {Error} Throws if the page version is not found
 */
export async function getflexOfficeEditorPagesPageIdVersionsVersionId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageVersion> {
  const { editor, pageId, versionId } = props;

  const pageVersion =
    await MyGlobal.prisma.flex_office_page_versions.findFirstOrThrow({
      where: {
        id: versionId,
        flex_office_page_id: pageId,
      },
    });

  return {
    id: pageVersion.id,
    flex_office_page_id: pageVersion.flex_office_page_id,
    version_number: pageVersion.version_number,
    page_data: pageVersion.page_data,
    created_at: toISOStringSafe(pageVersion.created_at),
  };
}
