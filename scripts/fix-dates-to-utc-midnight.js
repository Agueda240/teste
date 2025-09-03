// scripts/fix-dates-to-utc-noon-lisbon.js
require('dotenv').config();
const mongoose = require('mongoose');

const Patient  = require('../Models/Patient');
const FollowUp = require('../Models/FollowUp');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/yourdb';

const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

// converte um Date qualquer para o *dia civil de Lisboa* e devolve Date em *12:00Z* desse dia
function toUtcNoonKeepingLisbonDay(d) {
  if (!d) return d;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  // ex: "1996-07-05"
  const ymd = fmt.format(d);
  const [y, m, day] = ymd.split('-').map(n => parseInt(n, 10));
  // 12:00 UTC para “blindar” o dia
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0, 0));
}

(async () => {
  await mongoose.connect(MONGO_URI);

  let pScan = 0, pUpd = 0, fScan = 0, fUpd = 0;

  // Patients
  const patients = await Patient.find({}, { _id: 1, dateOfBirth: 1 }).lean();
  for (const p of patients) {
    pScan++;
    if (!p.dateOfBirth) continue;

    const newDob = toUtcNoonKeepingLisbonDay(new Date(p.dateOfBirth));
    if (+newDob !== +new Date(p.dateOfBirth)) {
      console.log(`[Patient] ${p._id} DOB: ${p.dateOfBirth.toISOString()} -> ${newDob.toISOString()}`);
      if (!DRY) {
        await Patient.updateOne({ _id: p._id }, { $set: { dateOfBirth: newDob } });
      }
      pUpd++;
    }
  }

  // FollowUps
  const followups = await FollowUp.find({}, {
    _id: 1, surgeryDate: 1, dischargeDate: 1
  }).lean();

  for (const fu of followups) {
    fScan++;
    const $set = {};

    if (fu.surgeryDate) {
      const nd = toUtcNoonKeepingLisbonDay(new Date(fu.surgeryDate));
      if (+nd !== +new Date(fu.surgeryDate)) {
        $set.surgeryDate = nd;
        console.log(`[FollowUp] ${fu._id} surgeryDate: ${new Date(fu.surgeryDate).toISOString()} -> ${nd.toISOString()}`);
      }
    }

    if (fu.dischargeDate) {
      const nd = toUtcNoonKeepingLisbonDay(new Date(fu.dischargeDate));
      if (+nd !== +new Date(fu.dischargeDate)) {
        $set.dischargeDate = nd;
        console.log(`[FollowUp] ${fu._id} dischargeDate: ${new Date(fu.dischargeDate).toISOString()} -> ${nd.toISOString()}`);
      }
    }

    if (Object.keys($set).length && !DRY) {
      await FollowUp.updateOne({ _id: fu._id }, { $set });
      fUpd++;
    } else if (Object.keys($set).length) {
      fUpd++;
    }
  }

  console.log('-----------------------------');
  console.log(`Patients scanned: ${pScan} | updated: ${pUpd}`);
  console.log(`FollowUps scanned: ${fScan} | updated: ${fUpd}`);
  console.log(DRY ? 'DRY RUN (nada foi gravado).' : '✅ Alterações gravadas.');
  await mongoose.disconnect();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
