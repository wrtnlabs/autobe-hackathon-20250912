import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new healthcare organization (tenant onboarding).
 *
 * This operation creates a new healthcare organization record, defining a
 * discrete tenant within the multi-tenant system. The request body must provide
 * business code, display name, and status. The corresponding Prisma model is
 * healthcare_platform_organizations; on creation, related data structures for
 * downstream assignments will be provisioned per business logic. Compliance and
 * audit trails are registered at time of creation for platform reporting.
 *
 * Only platform system administrators are authorized to execute this route. The
 * organization code must be unique; duplicate code results in a business logic
 * error.
 *
 * @param props - Properties for organization creation
 * @param props.systemAdmin - The authenticated system admin performing the
 *   operation
 * @param props.body - Organization onboarding data: code, name, and status
 * @returns The created organization's detail record
 * @throws {Error} When organization code is not unique or business logic error
 *   occurs
 */
export async function posthealthcarePlatformSystemAdminOrganizations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOrganization.ICreate;
}): Promise<IHealthcarePlatformOrganization> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_organizations.create({
        data: {
          id,
          code: body.code,
          name: body.name,
          status: body.status,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null && created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta?.target.includes("code")
    ) {
      throw new Error("Organization code must be unique");
    }
    throw err;
  }
}
