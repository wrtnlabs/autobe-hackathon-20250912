import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a user title by its unique identifier (hard delete).
 *
 * This operation removes the corresponding record permanently from the
 * chatbot_titles table. Only an admin user is authorized to perform this
 * operation.
 *
 * @param props - The request props
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.id - The UUID of the user title to delete
 * @throws {Error} Throws if the title does not exist
 */
export async function deletechatbotAdminTitlesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify existence or throw error
  await MyGlobal.prisma.chatbot_titles.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.chatbot_titles.delete({
    where: { id },
  });
}
