import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a FlexOffice viewer user by ID.
 *
 * This operation fetches complete details of one viewer user by their unique
 * identifier from the PostgreSQL flex_office_viewers table. Returns the full
 * data structure including name, email, and timestamps for creation and update.
 * If the viewer does not exist or is soft-deleted, an error is thrown.
 *
 * Authorization is enforced to allow access only to administrators.
 *
 * @param props - Object containing the admin payload and the UUID of the viewer
 *   to retrieve.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.viewerId - UUID of the viewer user to fetch.
 * @returns The detailed viewer user information conforming to
 *   IFlexOfficeViewer.
 * @throws {Error} If the viewer is not found or is soft-deleted.
 */
export async function getflexOfficeAdminViewersViewerId(props: {
  admin: AdminPayload;
  viewerId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeViewer> {
  const { admin, viewerId } = props;

  const viewer = await MyGlobal.prisma.flex_office_viewers.findFirstOrThrow({
    where: {
      id: viewerId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
    created_at: toISOStringSafe(viewer.created_at),
    updated_at: toISOStringSafe(viewer.updated_at),
  };
}
