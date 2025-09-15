import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

export async function putenterpriseLmsOrganizationAdminContentcreatorinstructorsContentcreatorinstructorId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentcreatorinstructorId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentCreatorInstructor.IUpdate;
}): Promise<IEnterpriseLmsContentCreatorInstructor> {
  const { organizationAdmin, contentcreatorinstructorId, body } = props;

  // Step1: Find the user to update and verify tenant ownership
  const existingUser =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUnique({
      where: { id: contentcreatorinstructorId },
    });
  if (!existingUser) {
    throw new Error(`Content creator/instructor user not found`);
  }

  if (existingUser.tenant_id !== organizationAdmin.id) {
    throw new Error(`Unauthorized: Tenant mismatch`);
  }

  // Step2: Reject tenant_id updates
  if (body.tenant_id !== undefined) {
    throw new Error(`tenant_id update not allowed`);
  }

  // Step3: Check email uniqueness if email is updated
  if (body.email !== undefined && body.email !== null) {
    const duplicate =
      await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findFirst({
        where: {
          tenant_id: existingUser.tenant_id,
          email: body.email,
          NOT: { id: contentcreatorinstructorId },
        },
      });
    if (duplicate) {
      throw new Error(
        `Email already in use by another content creator/instructor`,
      );
    }
  }

  // Step4: Prepare update data
  const updateData = {
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.password_hash !== undefined
      ? { password_hash: body.password_hash }
      : {}),
    ...(body.first_name !== undefined ? { first_name: body.first_name } : {}),
    ...(body.last_name !== undefined ? { last_name: body.last_name } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
  };

  const now = toISOStringSafe(new Date());

  // Step5: Perform update
  const updated =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.update({
      where: { id: contentcreatorinstructorId },
      data: { ...updateData, updated_at: now },
    });

  // Step6: Return object with proper date string types
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
