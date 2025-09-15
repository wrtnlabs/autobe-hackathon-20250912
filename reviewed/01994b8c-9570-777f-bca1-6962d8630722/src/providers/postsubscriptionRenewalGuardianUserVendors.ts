import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new subscription vendor.
 *
 * This operation creates a unique vendor identified by name. Authorization
 * required: user. The vendor name must be unique and duplicates will cause a
 * conflict error.
 *
 * @param props - Object containing authenticated user and vendor creation data.
 * @param props.user - Authenticated user making the request.
 * @param props.body - Vendor creation data with unique name.
 * @returns The created vendor record with UUID and timestamps.
 * @throws {Error} Conflict error if vendor name already exists.
 */
export async function postsubscriptionRenewalGuardianUserVendors(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianVendor.ICreate;
}): Promise<ISubscriptionRenewalGuardianVendor> {
  const { user, body } = props;

  const newId = v4() as string & tags.Format<"uuid">;

  try {
    const created =
      await MyGlobal.prisma.subscription_renewal_guardian_vendors.create({
        data: {
          id: newId,
          name: body.name,
        },
      });

    return {
      id: created.id,
      name: created.name,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("name")
    ) {
      throw new Error("Conflict: Vendor name already exists");
    }
    throw error;
  }
}
