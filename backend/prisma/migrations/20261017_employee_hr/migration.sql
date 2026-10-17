-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passport" TEXT,
    "pinfl" TEXT,
    "address" TEXT,
    "jobTitle" TEXT,
    "hiredAt" TIMESTAMP(3),
    "salaryType" TEXT,
    "monthlySalary" DECIMAL(18,2),
    "commissionPercent" DECIMAL(6,3),
    "commissionBasis" TEXT,
    "certificateRequired" BOOLEAN NOT NULL DEFAULT false,
    "certificateNumber" TEXT,
    "certificateIssuedAt" TIMESTAMP(3),
    "certificateExpiresAt" TIMESTAMP(3),
    "certificateFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLaborContract" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "termsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLaborContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTraining" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "serviceMonths" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTraining_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLaborContract_contractNumber_key" ON "EmployeeLaborContract"("contractNumber");

-- CreateIndex
CREATE INDEX "EmployeeLaborContract_employeeId_createdAt_idx" ON "EmployeeLaborContract"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeTraining_employeeId_idx" ON "EmployeeTraining"("employeeId");

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLaborContract" ADD CONSTRAINT "EmployeeLaborContract_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTraining" ADD CONSTRAINT "EmployeeTraining_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

