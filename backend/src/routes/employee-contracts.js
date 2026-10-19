import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { auth, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(auth, allowRoles('SUPER_ADMIN', 'DIRECTOR'));
const optionalText = z.string().trim().max(500).nullable().optional();
const profileSchema = z.object({
  passport: optionalText, pinfl: z.string().regex(/^\d{14}$/).nullable().optional().or(z.literal('')),
  address: optionalText, jobTitle: optionalText,
  hiredAt: z.string().datetime().nullable().optional(),
  salaryType: z.enum(['FIXED','PERCENT','MIXED']).nullable().optional(),
  monthlySalary: z.number().nonnegative().max(1e12).nullable().optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
  commissionBasis: optionalText, certificateRequired: z.boolean().optional(),
  certificateNumber: optionalText,
  certificateIssuedAt: z.string().datetime().nullable().optional(),
  certificateExpiresAt: z.string().datetime().nullable().optional(),
  certificateFileUrl: z.string().url().nullable().optional(),
});
const contractSchema = z.object({
  contractNumber: z.string().trim().min(3).max(80),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  details: z.object({
    employerRepresentative: z.string().trim().max(500).optional(),
    employerTin: z.string().trim().max(500).optional(),
    employerAddress: z.string().trim().max(500).optional(),
    workplaceAddress: z.string().trim().max(500).optional(),
    probation: z.string().trim().max(500).optional(),
    payDay1: z.string().trim().max(500).optional(),
    payDay2: z.string().trim().max(500).optional(),
    paymentMethod: z.string().trim().max(500).optional(),
    workDays: z.string().trim().max(500).optional(),
    weeklyHours: z.string().trim().max(500).optional(),
    workStart: z.string().trim().max(500).optional(),
    workEnd: z.string().trim().max(500).optional(),
    breakTime: z.string().trim().max(500).optional(),
    restDays: z.string().trim().max(500).optional(),
    leaveDays: z.string().trim().max(500).optional(),
    additionalLeave: z.string().trim().max(500).optional(),
    safetyConditions: z.string().trim().max(500).optional(),
    fixedTermReason: z.string().trim().max(500).optional(),
    passport: z.string().trim().max(500).optional(),
    pinfl: z.string().trim().max(500).optional(),
    address: z.string().trim().max(500).optional(),
  }).strict().optional(),
});
const settingsSchema = z.object({
  taxId: optionalText, legalAddress: optionalText,
  authorizedRepresentative: optionalText, workplaceAddress: optionalText,
  probationPeriod: optionalText, firstPayDate: optionalText,
  secondPayDate: optionalText, paymentMethod: optionalText,
  workDaysPerWeek: optionalText, weeklyHours: optionalText,
  workStartTime: optionalText, workEndTime: optionalText,
  breakTime: optionalText, restDays: optionalText,
  annualLeaveDays: z.number().int().min(0).max(365).nullable().optional(),
  additionalLeave: optionalText, workConditions: optionalText,
}).strict();
// Maps persisted company defaults to the existing printed contract detail keys.
const settingToDetail = {
  authorizedRepresentative: 'employerRepresentative', taxId: 'employerTin',
  legalAddress: 'employerAddress', workplaceAddress: 'workplaceAddress',
  probationPeriod: 'probation', firstPayDate: 'payDay1',
  secondPayDate: 'payDay2', paymentMethod: 'paymentMethod',
  workDaysPerWeek: 'workDays', weeklyHours: 'weeklyHours',
  workStartTime: 'workStart', workEndTime: 'workEnd',
  breakTime: 'breakTime', restDays: 'restDays',
  annualLeaveDays: 'leaveDays', additionalLeave: 'additionalLeave',
  workConditions: 'safetyConditions',
};
const settingsAsDetails = settings => Object.fromEntries(
  Object.entries(settingToDetail)
    .filter(([key]) => settings?.[key] !== undefined && settings?.[key] !== null)
    .map(([key, detailKey]) => [detailKey, String(settings[key])])
);
async function currentCompanyId(req) {
  if (req.user?.companyId) return req.user.companyId;
  if (req.user?.branchId) {
    const branch = await prisma.branch.findUnique({where:{id:req.user.branchId},select:{companyId:true}});
    return branch?.companyId ?? null;
  }
  return null;
}
async function authorizedStaff(req, userId) {
  const companyId = await currentCompanyId(req);
  if (!companyId) return null;
  return prisma.user.findFirst({where:{id:userId,companyId,role:{in:['SUPER_ADMIN','DIRECTOR','BRANCH_MANAGER','RECEPTION_MANAGER','EXECUTOR','LAWYER','ACCOUNTANT']}}});
}
router.get('/company/settings', async (req,res,next)=>{
  try {
    const companyId = await currentCompanyId(req);
    if (!companyId) return res.status(403).json({message:'Фойдаланувчига корхона бириктирилмаган'});
    const settings = await prisma.companyHrSettings.findUnique({where:{companyId}});
    return res.json({settings});
  } catch(e){next(e)}
});
router.put('/company/settings', async (req,res,next)=>{
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({message:'Созламалар нотўғри',issues:parsed.error.issues});
    const companyId = await currentCompanyId(req);
    if (!companyId) return res.status(403).json({message:'Фойдаланувчига корхона бириктирилмаган'});
    const settings = await prisma.companyHrSettings.upsert({
      where:{companyId}, create:{companyId,...parsed.data}, update:parsed.data,
    });
    return res.json({settings});
  } catch(e){next(e)}
});
const trainingSchema = z.object({
  description: z.string().trim().min(3).max(2000),
  cost: z.number().nonnegative().max(1e12).nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});
const dates = (obj, keys) => Object.fromEntries(Object.entries(obj).map(([key,val]) => [key, keys.includes(key) && val ? new Date(val) : val]));
router.get('/:userId', async (req,res,next)=>{
  try {
    if (!await authorizedStaff(req, req.params.userId)) return res.status(404).json({message:'Ходим топилмади'});
    const profile = await prisma.employeeProfile.findUnique({where:{userId:req.params.userId},include:{laborContracts:{orderBy:{createdAt:'desc'}},trainings:{orderBy:{createdAt:'desc'}}}});
    return res.json({profile});
  } catch(e){next(e)}
});
router.put('/:userId/profile', async (req,res,next)=>{
  try {
    const parsed=profileSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({message:'Маълумотлар нотўғри',issues:parsed.error.issues});
    if (!await authorizedStaff(req, req.params.userId)) return res.status(404).json({message:'Ходим топилмади'});
    const data=dates(parsed.data,['hiredAt','certificateIssuedAt','certificateExpiresAt']);
    if(data.pinfl==='') data.pinfl=null;
    const profile=await prisma.employeeProfile.upsert({where:{userId:req.params.userId},create:{...data,userId:req.params.userId},update:data});
    return res.json({profile});
  } catch(e){next(e)}
});
router.post('/:userId/contracts', async(req,res,next)=>{
  try {
    const parsed=contractSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({message:'Шартнома маълумотлари нотўғри',issues:parsed.error.issues});
    if (!await authorizedStaff(req, req.params.userId)) return res.status(404).json({message:'Ходим топилмади'});
    const profile=await prisma.employeeProfile.findUnique({where:{userId:req.params.userId}});
    if(!profile) return res.status(400).json({message:'Аввал ходим карточкасини сақланг'});
    if(!profile.jobTitle || !profile.salaryType) return res.status(400).json({message:'Лавозим ва иш ҳақи тартибини тўлдиринг'});
    if(profile.certificateRequired && !profile.certificateNumber) return res.status(400).json({message:'Малака сертификати рақами талаб қилинади'});
    const companyId = await currentCompanyId(req);
    const companySettings = await prisma.companyHrSettings.findUnique({where:{companyId}});
    const {details = {}, ...contractInput} = parsed.data;
    const mergedDetails = {...settingsAsDetails(companySettings), ...details};
    // Employee-specific fields come from the saved employee profile unless explicitly overridden.
    for (const key of ['passport','pinfl','address']) {
      if (!mergedDetails[key] && profile[key]) mergedDetails[key] = String(profile[key]);
    }
    const data=dates(contractInput,['startDate','endDate']);
    const termsSnapshot={jobTitle:profile.jobTitle,salaryType:profile.salaryType,monthlySalary:profile.monthlySalary?.toString()??null,commissionPercent:profile.commissionPercent?.toString()??null,commissionBasis:profile.commissionBasis,certificateRequired:profile.certificateRequired,certificateNumber:profile.certificateNumber,...mergedDetails};
    const contract=await prisma.employeeLaborContract.create({data:{...data,employeeId:profile.id,termsSnapshot,status:'DRAFT'}});
    return res.status(201).json({contract});
  } catch(e){if(e.code==='P2002') return res.status(409).json({message:'Бу шартнома рақами мавжуд'});next(e)}
});
router.post('/:userId/trainings', async(req,res,next)=>{
  try {
    const parsed=trainingSchema.safeParse(req.body);
    if(!parsed.success) return res.status(400).json({message:'Ўқитиш маълумотлари нотўғри',issues:parsed.error.issues});
    if (!await authorizedStaff(req, req.params.userId)) return res.status(404).json({message:'Ходим топилмади'});
    const profile=await prisma.employeeProfile.findUnique({where:{userId:req.params.userId}});
    if(!profile) return res.status(400).json({message:'Аввал ходим карточкасини сақланг'});
    const training=await prisma.employeeTraining.create({data:{...dates(parsed.data,['startedAt','completedAt']),employeeId:profile.id,serviceMonths:60,status:'DRAFT'}});
    return res.status(201).json({training});
  } catch(e){next(e)}
});
export default router;
