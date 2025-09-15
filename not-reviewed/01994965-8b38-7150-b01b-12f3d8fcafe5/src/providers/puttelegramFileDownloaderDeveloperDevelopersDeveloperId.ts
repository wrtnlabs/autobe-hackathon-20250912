import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update an existing developer user's information in the Telegram File
 * Downloader system.
 *
 * This operation modifies fields like email and password hash, ensuring the
 * user's identity and credentials can be kept current.
 *
 * Security measures require authenticated developer users to invoke this API
 * and enforce ownership checks to prevent unauthorized updates.
 *
 * @param props - Object containing authenticated developer, target developerId,
 *   and update payload
 * @param props.developer - The authenticated developer making the update
 *   request
 * @param props.developerId - UUID of the developer user to update
 * @param props.body - Partial update data including email and/or password_hash
 * @returns The updated developer user record
 * @throws {Error} When the developer user is not found or is soft deleted
 * @throws {Error} When the authenticated developer tries to update another
 *   developer's record
 */
export async function puttelegramFileDownloaderDeveloperDevelopersDeveloperId(props: {
  developer: DeveloperPayload;
  developerId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderDeveloper.IUpdate;
}): Promise<ITelegramFileDownloaderDeveloper> {
  const { developer, developerId, body } = props;

  // Fetch the existing developer record (must be active)
  const existing =
    await MyGlobal.prisma.telegram_file_downloader_developers.findUnique({
      where: { id: developerId },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new Error(`Developer user not found`);
  }

  // Authorization: Ensure the authenticated developer is the target developer
  if (developer.id !== developerId) {
    throw new Error(`Unauthorized to update another developer's profile`);
  }

  // Prepare updated fields
  const data: {
    email?: string | undefined;
    password_hash?: string | undefined;
    deleted_at?: string | null | undefined;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.email !== undefined) {
    data.email = body.email;
  }

  if (body.password_hash !== undefined) {
    // Hash the password before updating
    data.password_hash = await MyGlobal.password.hash(body.password_hash);
  }

  if (body.deleted_at !== undefined) {
    data.deleted_at = body.deleted_at;
  }

  // Perform the update
  const updated =
    await MyGlobal.prisma.telegram_file_downloader_developers.update({
      where: { id: developerId },
      data: data,
    });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
