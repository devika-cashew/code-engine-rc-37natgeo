const logger = require('../services/logger.js').logger;
const admin = require('firebase-admin');
const serviceAccount = require('../services/serviceAccountKey.json');

async function handleActions(action, uid) {
    let result;
    switch(action.name) {
      case "saveTaskInfo":
          result = await saveTaskInfo(action.parameters, uid);
          break;
  }
  return { save_task_info_result: result };
}

async function saveTaskInfo(params, uid) {
  return new Promise(async function(resolve, reject) {
        let saveInfoResult = await writeToDB(params, uid);
        resolve(saveInfoResult);
  });
}
async function writeToDB(params, uid) {
  return new Promise(async function(resolve, reject) {
    !admin.apps.length 
      ? admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        })
      : admin.app();

    const db = admin.firestore();
    const task = 'DowntonAbbey';
    let statusKey = `tasks.${task}.status`, resultKey = `tasks.${task}.result`;

    let data = {
      [statusKey]: 'Pending Review',
      [resultKey]: {
        likelyGoToSkill: params.likelyGoToSkill,
        launchGet: params.launchGet,
        launchSomethingElse: params.launchSomethingElse,
        thinkOfExperience: params.thinkOfExperience,
        howRelevant: params.howRelevant,
        doAfterSkill: params.doAfterSkill,
        factors: params.factors,
        wellRemember: params.wellRemember,
        describe: params.describe,
        likelyToPurchaseTickets: params.likelyToPurchaseTickets,
        reasonsWatchPremiere: params.reasonsWatchPremiere,
        optionFirstChoice: params.optionFirstChoice,
        getLinkOnPhone: params.getLinkOnPhone,
        satisfiedStartTour: params.satisfiedStartTour,
        satisfiedPlayTrivia: params.satisfiedPlayTrivia,
        recommendMovie: params.recommendMovie,
        hearAudioAd: params.hearAudioAd,
      }
    }

    const userRef = db.collection('users').doc(uid);

    //Get Submitted Earning
    let submittedEarning = 0;
    const doc = await userRef.get();
    if (!doc.exists) {
			logger.log('error', `Could not find user with UID: ${uid}`);
			return;
		} else {
			record = doc.data();
      if(record.earnings) {
        submittedEarning = record.earnings.submitted || 0;
      }
    }
      //End Get Submitted Earning
    let reward = Number(record.tasks[task].reward);

    let newEarning = reward;
    if(record.tasks[task]) {
      if(record.tasks[task].earning) {
        if(record.tasks[task].earning > 0) {
          newEarning = 0;
        }
      }
    }

    submittedEarning += newEarning;

    let earningKey = `tasks.${task}.earning`,
      lastUpdatedAtKey = `tasks.${task}.lastUpdatedAt`,
      taskCompletedAtKey = `tasks.${task}.taskCompletedAt`;

    try {
      await userRef.update(data);
      await userRef.update({'earnings.submitted': submittedEarning});
      await userRef.update({[earningKey]: reward});
      await userRef.update({[lastUpdatedAtKey]: admin.firestore.FieldValue.serverTimestamp()});
			await userRef.update({[taskCompletedAtKey]: admin.firestore.FieldValue.serverTimestamp()});

      resolve('SUCCESS');
    } catch(error) {
      logger.log('error', `Error while writing ${task} results to DB: ${uid}`);
      logger.log(error);
      resolve('FAIL');
    }
  });
}

exports.handleActions = handleActions;