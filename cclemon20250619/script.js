/*===== 1. Firebase 設定 (貼り付け箇所) =====*/
// Firebaseプロジェクトの設定情報
const firebaseConfig = {
  apiKey            : "AIzaSyDN9A-Vp7QfP9JOeHOqB845CmjTb4HS3tQ", // Firebase APIキー
  authDomain        : "cclemononline.firebaseapp.com",          // Firebase認証ドメイン
  databaseURL       : "https://cclemononline-default-rtdb.asia-southeast1.firebasedatabase.app", // Firebase Realtime Database URL
  projectId         : "cclemononline",                          // FirebaseプロジェクトID
  storageBucket     : "cclemononline.appspot.com",              // Firebase Storageバケット
  messagingSenderId : "954777678519",                          // FirebaseメッセージングセンダーID
  appId             : "1:954777678519:web:43643a836ba0eff0771332" // Firebase App ID
};
firebase.initializeApp(firebaseConfig); // Firebaseアプリを初期化
const db = firebase.database(); // Firebase Realtime Databaseのインスタンスを取得

/*===== 1. サウンド再生関数 =====*/
// --- ここから音声再生関連 ---
function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0; // 再生位置を先頭に戻す
        sound.play().catch(error => {
            console.error("Audio play failed for " + soundId + ":", error);
        });
    } else {
        console.warn("Sound element not found: " + soundId);
    }
}
// --- ここまで音声再生関連 ---

/*===== 2. 定数定義 =====*/
// ゲームの基本設定値
const PLAYER_INITIAL_SHIELD = 5; // プレイヤーの初期シールド数
const SPECIAL_ACTION_ENERGY_COST = 3;    // Special Actionに必要なエネルギーコスト

// UI関連の定数
const FLASH_DEFAULT_DURATION_MS = 850;  // flashメッセージのデフォルト表示時間 (ミリ秒) - 行動カットイン用に戻す
const FLASH_WIN_LOSE_DURATION_MS = 2500; // 勝利・敗北メッセージの表示時間 (ミリ秒) - 長くする
const RESOLVE_RESET_DELAY_MS = 1000; // 勝敗決定後、ゲームリセットまでの遅延時間 (ミリ秒)

// プレイヤーの行動を表す定数
const MOVE_CHARGE = 'c';        // 行動: 溜め
const MOVE_BLOCK = 'b';         // 行動: 防御
const MOVE_ATTACK = 'a';        // 行動: 攻撃
const MOVE_SPECIAL_ACTION = 's'; // 行動: Special Action (旧かめはめ波)

// AI Q学習関連の定数
const AI_ACTIONS_FOR_Q_LEARNING = [MOVE_ATTACK, MOVE_BLOCK, MOVE_CHARGE]; // Q学習対象のアクション
const Q_TABLE_LOCAL_STORAGE_KEY = "qLearningTable"; // Qテーブルをローカルストレージに保存する際のキー

// ゲームモードを表す定数
const GAME_MODE_PVE = "PvE"; // ゲームモード: Player vs AI
const GAME_MODE_PVP = "PvP"; // ゲームモード: Player vs Player
const GAME_MODE_EVE = "EvE"; // ゲームモード: AI vs AI (New)

// Firebase Realtime Database関連の定数 (PvP用)
const FIREBASE_ROOMS_PATH = 'rooms/';       // Firebase上のルームデータが格納されるパス
const PLAYER_ROLE_P1 = 'p1';                // プレイヤー1のロール識別子
const PLAYER_ROLE_P2 = 'p2';                // プレイヤー2のロール識別子
const FIREBASE_KEY_ENERGY = 'en';           // Firebaseデータキー: エネルギー
const FIREBASE_KEY_SHIELD = 'sh';           // Firebaseデータキー: シールド
const FIREBASE_KEY_MOVE = 'move';           // Firebaseデータキー: 行動

// UIメッセージ定数
const UI_MSG_CHOOSE_ACTION = '行動を選択してください';         // 行動選択を促すメッセージ
const UI_MSG_WAITING_OPPONENT = 'あなたの手を選択済。相手の選択を待っています…'; // 対戦相手の行動待ちメッセージ
const UI_MSG_MATCH_READY_CHOOSE_ACTION = 'マッチング成立！行動を選択してください。'; // PvPマッチ成立時のメッセージ (New)
const UI_MSG_SHARE_ROOM_ID_P1 = '相手にルームIDを伝えてください。相手の参加を待っています…'; // P1がルーム作成後、P2参加待ち (New)
const UI_MSG_ROOM_ID_NOT_FOUND = 'ID 不存在';             // ルームIDが見つからない場合のメッセージ
const UI_MSG_INSUFFICIENT_ENERGY = 'EN不足';              // エネルギー不足時のメッセージ
const UI_MSG_INSUFFICIENT_SHIELD = 'SH不足';              // シールド不足時のメッセージ
const UI_MSG_AI_OPPONENT_NAME = 'AI';                     // AI対戦相手の表示名
const UI_MSG_PLAYER_OPPONENT_NAME = '相手';                 // PvP対戦相手の表示名
const UI_MSG_EVE_OPPONENT_NAME = 'AI 1 vs AI 2';      // EvEモード時の対戦相手表示名 (New)
const UI_MSG_EVE_MODE_ACTIVE = 'AI 対戦中...';        // EvEモード実行中のメッセージ (New)

// AI ε-greedy (イプシロン・グリーディ) 法のパラメータ
const EPSILON_VISIT_THRESHOLD_1 = 5;    // ε値を変更する状態訪問回数の閾値1
const EPSILON_VISIT_THRESHOLD_2 = 20;   // ε値を変更する状態訪問回数の閾値2
const EPSILON_INITIAL = 0.4;            // 初期ε値 (探索の割合が高い)
const EPSILON_INTERMEDIATE = 0.2;       // 中間ε値
const EPSILON_LOW = 0.05;               // 低ε値 (活用が多くなる)
const EPSILON_ON_LOSE_STREAK = 0.8;     // AI連敗時のε値 (探索を増やして打開を図る)
const EPSILON_INCREASE_ON_NEGATIVE_VALUE = 0.3; // Q値が負の場合にε値に加算する値 (より探索的に)
const AI_RANDOM_CHOICE_PROBABILITY = 0.5; // ε-greedyで最善手がない場合や、特定条件下でランダム行動を選択する確率

// EvE モード関連の定数 (New)
const EVE_TURN_DELAY_MS = 1000; // EvEモードのターン間遅延 (ミリ秒) - 500から変更

/*===== 3. ゲーム共通状態 =====*/
// ゲーム中に変動するプレイヤーと相手の状態
let playerEnergy = 0, opponentEnergy = 0; // プレイヤーと相手の現在のエネルギー
let playerShield = PLAYER_INITIAL_SHIELD, opponentShield = PLAYER_INITIAL_SHIELD; // プレイヤーと相手の現在のシールド
let isInputLocked = false; // プレイヤーの入力がロックされているか (true:ロック中, false:入力可能)
let currentGameMode = GAME_MODE_PVE; // 現在のゲームモード (初期値はPvE)
let pveLoseStreak = 0; // PvEモードでのAIの連敗数 (AIの戦略調整用)
let currentTurnNumber = 0; // 現在のターン数を記録
const qLearningTrajectory = []; // 1ゲーム内のAIの行動と状態の履歴 (Q学習用)
const qLearningTable = JSON.parse(localStorage.getItem(Q_TABLE_LOCAL_STORAGE_KEY) || "{}"); // Q学習テーブル (ローカルストレージから読み込み)
let isEveGameRunning = false; // EvEモードのゲームが実行中かどうかのフラグ (New)

/*===== 4. DOM要素 =====*/
// HTML要素への参照をキャッシュ
const $=id=>document.getElementById(id); // document.getElementByIdのショートハンド
const playerEnergyElement = $("pEn"), opponentEnergyElement = $("aEn"); // エネルギー表示要素
const playerShieldElement = $("pSh"), opponentShieldElement = $("aSh"); // シールド表示要素
const chargeButtonElement = $("btnC"), blockButtonElement = $("btnB");        // 行動ボタン要素 (溜め、防御)
const attackButtonElement = $("btnA"), specialActionButtonElement = $("btnS"); // 行動ボタン要素 (攻撃、Special Action)
const cutinElement = $("cutin"), resultMessageElement = $("result");     // カットイン表示要素、結果メッセージ表示要素
const allActionButtons = [chargeButtonElement, blockButtonElement, attackButtonElement, specialActionButtonElement]; // プレイヤーの行動ボタンの配列
const pveModeButtonElement = $("btnPvE"), pvpModeButtonElement = $("btnPvP"), eveModeButtonElement = $("btnEvE"); // モード選択ボタン要素 (btnEvE を追加)
const onlinePanelElement = $("onlinePanel"); // PvP用オンラインパネル要素
const createRoomButtonElement = $("btnCreate"), joinRoomButtonElement = $("btnJoin"); // ルーム作成/参加ボタン要素
const roomIdDisplayElement = $("roomIdDisp"); // ルームID表示要素
const joinRoomIdInputElement = $("joinId"), onlineMessageElement = $("onlineMsg"); // ルームID入力要素、オンラインメッセージ表示要素
const player1NameDisplayElement = $("p1Name"); // プレイヤー1名表示要素 (旧opNameの役割も含む)
const player2NameDisplayElement = $("p2Name"); // プレイヤー2名表示要素
const turnHistoryLogElement = $("turnHistoryLog"); // 新しい行動履歴ログ要素

/*===== 5. UIヘルパー関数 =====*/
// UI表示を更新する関数群

/**
 * プレイヤーと相手のエネルギー、シールドをUIに反映し、Special Actionボタンの表示/非表示を切り替える
 */
function showUI(){
  if (currentGameMode === GAME_MODE_EVE) {
    // EvEモード: playerEnergy/Shield は AI1, opponentEnergy/Shield は AI2
    playerEnergyElement.textContent = playerEnergy;   // AI1 Energy (表示はプレイヤー側を流用)
    playerShieldElement.textContent = playerShield;   // AI1 Shield
    opponentEnergyElement.textContent = opponentEnergy; // AI2 Energy (表示は相手側を流用)
    opponentShieldElement.textContent = opponentShield; // AI2 Shield
    player1NameDisplayElement.textContent = "AI 1";
    player2NameDisplayElement.textContent = "AI 2";
    allActionButtons.forEach(btn => btn.style.display = 'none'); // プレイヤー操作ボタンを非表示
    specialActionButtonElement.style.display = 'none'; // Special Actionボタンも非表示
  } else {
    player1NameDisplayElement.textContent = "あなた"; // PvE, PvP時はプレイヤー名
    player2NameDisplayElement.textContent = currentGameMode === GAME_MODE_PVE ? UI_MSG_AI_OPPONENT_NAME : UI_MSG_PLAYER_OPPONENT_NAME; // 対戦相手名
    playerEnergyElement.textContent = playerEnergy; opponentEnergyElement.textContent = opponentEnergy;
    playerShieldElement.textContent = playerShield; opponentShieldElement.textContent = opponentShield;
    allActionButtons.forEach(btn => btn.style.display = 'inline-block'); // プレイヤー操作ボタンを表示
    specialActionButtonElement.style.display = playerEnergy >= SPECIAL_ACTION_ENERGY_COST ? 'inline-block' : 'none';
  }
}
/**
 * プレイヤーの行動ボタンを無効化する
 */
function lockInput() {
  isInputLocked = true;
  allActionButtons.forEach(button => button.classList.add('disabled'));
}
/**
 * プレイヤーの行動ボタンを有効化する
 */
function unlockInput() {
  isInputLocked = false;
  allActionButtons.forEach(button => button.classList.remove('disabled'));
}
/**
 * 画面中央にメッセージを一時的に表示する (カットイン風)
 * @param {string} text 表示するメッセージ
 * @param {number} [duration] 表示時間 (ミリ秒)。指定しない場合はFLASH_DEFAULT_DURATION_MSを使用
 * @param {string} text 表示するメッセージ
 * @param {function} [callback] 表示終了後に実行するコールバック関数
 */
function flashMessage(text, duration, callback) {
  lockInput(); // メッセージ表示中は入力をロック
  cutinElement.textContent = text;
  cutinElement.style.display = 'block';
  const displayDuration = duration || FLASH_DEFAULT_DURATION_MS;

  // メッセージの長さに応じてフォントサイズを調整 (任意)
  if (text.length > 30) cutinElement.style.fontSize = '2em';
  else if (text.length > 20) cutinElement.style.fontSize = '2.5em';
  else cutinElement.style.fontSize = '3.2em';

  setTimeout(() => {
    cutinElement.style.display = 'none';
    if (currentGameMode !== GAME_MODE_EVE) { // EvEモードでない場合のみ入力ロック解除
      unlockInput();
    }
    if (callback) callback();
  }, displayDuration); // 正しい表示時間を使用
}
/**
 * Q学習用の現在の状態キーを生成する (プレイヤーEN_相手EN)
 * @returns {string} 現在の状態を表す文字列キー
 */
function getCurrentStateKey() { return `${playerEnergy}_${opponentEnergy}`; }

/**
 * 指定されたエネルギーとシールドでAIが実行可能な行動のリストを返す
 * @param {number} currentEnergy AIの現在のエネルギー
 * @param {number} currentShield AIの現在のシールド
 * @returns {string[]} 有効な行動の定数の配列
 */
function getValidMovesForAI(currentEnergy, currentShield) {
    const validMoves = [MOVE_CHARGE]; // 溜めは常に可能
    if (currentEnergy > 0) {
        validMoves.push(MOVE_ATTACK);
    }
    if (currentShield > 0) {
        validMoves.push(MOVE_BLOCK);
    }
    if (currentEnergy >= SPECIAL_ACTION_ENERGY_COST) {
        validMoves.push(MOVE_SPECIAL_ACTION);
    }
    return validMoves;
}

/*===== 6. AI (PvE) =====*/
// PvEモードにおけるAIの行動選択ロジック

/**
 * Qテーブルから現在の状態で最も価値の高い行動を選択する
 * @returns {string|null} 最善手のアクション。対応するアクションがない場合はnull
 */
function bestActionFromQ(){
  const stateActions = qLearningTable[getCurrentStateKey()]; // 現在の状態に対応するQテーブルのエントリを取得
  if (!stateActions) return null; // Qテーブルに現在の状態がなければnull

  let bestAction = null;
  let maxValue = -Infinity;
  // Q学習対象のアクションの中から最も価値(v)の高いものを探す
  for (const action of AI_ACTIONS_FOR_Q_LEARNING) {
    const qEntry = stateActions[action];
    if (qEntry && qEntry.v > maxValue) {
      maxValue = qEntry.v;
      bestAction = action;
    }
  }
  return bestAction;
}
/**
 * @deprecated PvE/EvEのAI戦略では getValidMovesForAI を使用するため、この関数は直接使用されなくなります。
 * ただし、他の箇所で参照されている可能性を考慮し、コメントアウトせずに残します。
 * AIが取りうる有効な行動の中からランダムに1つ選択する (PvEのAI視点)
 * @returns {string} ランダムに選択された有効な行動
 */
// function randomValid(){
//   // この関数は PvE の AI (opponentEnergy, opponentShield を参照) を前提としていた。
//   // EvEモードのAI1 (playerEnergy, playerShield を参照) では正しく機能しない。
//   const possibleMoves = [];
//   if (opponentEnergy > 0) possibleMoves.push(MOVE_ATTACK);
//   if (opponentShield > 0) possibleMoves.push(MOVE_BLOCK);
//   possibleMoves.push(MOVE_CHARGE);
//   return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
// }

/**
 * AIの行動戦略を決定する (PvEモードのAI、またはEvEモードのAI1用)
 * 優先順位: 固定ルール -> ε-greedy法 -> 簡易ヒューリスティック
 * @returns {string} AIが選択した行動
 */
function aiStrategy(){
  // 現在のゲームモードに応じて、AI自身のリソースと相手のリソースを決定
  let aiSelfEnergy, aiSelfShield, aiOpponentEnergy, aiOpponentShield;
  if (currentGameMode === GAME_MODE_EVE) { // EvEモード: AI1の視点
    aiSelfEnergy = playerEnergy;
    aiSelfShield = playerShield;
    aiOpponentEnergy = opponentEnergy;
    aiOpponentShield = opponentShield;
  } else { // PvEモード: AIの視点
    aiSelfEnergy = opponentEnergy;
    aiSelfShield = opponentShield;
    aiOpponentEnergy = playerEnergy;
    aiOpponentShield = playerShield;
  }

  const validMovesForAISelf = getValidMovesForAI(aiSelfEnergy, aiSelfShield);

  // 1. 固定ルール (特定の状況下で最善と思われる行動)
  // 自分AIがSpecial Actionを撃てる場合は必ず撃つ
  if (validMovesForAISelf.includes(MOVE_SPECIAL_ACTION)) {
    return MOVE_SPECIAL_ACTION;
  }
  // 相手と自分のエネルギーが0なら溜める
  if (aiSelfEnergy === 0 && aiOpponentEnergy === 0 && validMovesForAISelf.includes(MOVE_CHARGE)) {
    return MOVE_CHARGE;
  }
  // 自分のエネルギーが0、相手のエネルギーが2なら溜める
  if (aiSelfEnergy === 0 && aiOpponentEnergy === 2 && validMovesForAISelf.includes(MOVE_CHARGE)) {
    return MOVE_CHARGE;
  }
  // 相手のエネルギーが0、自分のエネルギーが2なら溜める
  if (aiOpponentEnergy === 0 && aiSelfEnergy === 2 && validMovesForAISelf.includes(MOVE_CHARGE)) {
    return MOVE_CHARGE;
  }

  // 2. ε-greedy法による行動選択
  const currentStateKey = getCurrentStateKey();
  const qStateTable = qLearningTable[currentStateKey];
  // 現在の状態の訪問回数を計算
  const stateVisits = qStateTable ? Object.values(qStateTable).reduce((sum, entry) => sum + entry.c, 0) : 0;
  
  const bestQAction = bestActionFromQ(); // Q学習による最善手
  const bestQValue = bestQAction && qStateTable ? qStateTable[bestQAction].v : 0; // その最善手の価値
  
  // ε (イプシロン) 値の動的調整
  let epsilon = stateVisits < EPSILON_VISIT_THRESHOLD_1 ? EPSILON_INITIAL :
                stateVisits < EPSILON_VISIT_THRESHOLD_2 ? EPSILON_INTERMEDIATE : EPSILON_LOW;

  if (pveLoseStreak >= 3) { // AIが3連敗以上している場合
    epsilon = EPSILON_ON_LOSE_STREAK; // ε値を大きくして探索的な行動を増やす
  } else if (bestQValue < 0) { // 最善手のQ値が負の場合
    epsilon = Math.min(1, epsilon + EPSILON_INCREASE_ON_NEGATIVE_VALUE); // ε値を増やして他の手を試す
  }

  // εの確率でランダムな有効行動を選択 (探索)
  if (Math.random() < epsilon) {
    return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)];
  }

  // (1-ε)の確率でQ学習による最善手を選択 (活用)。AI自身が実行可能か確認。
  if (bestQAction && validMovesForAISelf.includes(bestQAction)) {
    return bestQAction;
  }

  // Q学習による最善手がない、またはAIが実行不可能な場合、一定確率でランダムな有効行動
  if (Math.random() < AI_RANDOM_CHOICE_PROBABILITY) {
    return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)];
  }

  // 3. 簡易ヒューリスティック (上記で決まらない場合のフォールバック)
  // AI自身のエネルギー (aiSelfEnergy) と AI自身のシールド (aiSelfShield) に基づく。
  // 相手のエネルギー (aiOpponentEnergy) と 相手のシールド (aiOpponentShield) も考慮。
  if (aiSelfEnergy === 1) { // AI自身のENが1
    // 自分SHあり且つ相手SHあれば防御、なければ攻撃
    if (aiSelfShield > 0 && aiOpponentShield > 0 && validMovesForAISelf.includes(MOVE_BLOCK)) return MOVE_BLOCK;
    if (validMovesForAISelf.includes(MOVE_ATTACK)) return MOVE_ATTACK; // 攻撃が有効なら攻撃
  }
  if (aiSelfEnergy === 2) { // AI自身のENが2
    if (aiOpponentEnergy > 0 && validMovesForAISelf.includes(MOVE_ATTACK)) return MOVE_ATTACK; // 相手にENがあれば攻撃
    // 相手にENがなく、自分にSHがあれば防御
    else if (aiSelfShield > 0 && validMovesForAISelf.includes(MOVE_BLOCK)) return MOVE_BLOCK;
  }
  if (aiSelfEnergy >= SPECIAL_ACTION_ENERGY_COST) { // AI自身がSpecial Actionを撃てるENを持っている
    // 自分SHあり且つ相手SHあれば防御
    if (aiSelfShield > 0 && aiOpponentShield > 0 && validMovesForAISelf.includes(MOVE_BLOCK)) return MOVE_BLOCK;
    // なければ相手EN見て攻撃か溜め
    else if (aiOpponentEnergy > 0 && validMovesForAISelf.includes(MOVE_ATTACK)) return MOVE_ATTACK;
    else if (validMovesForAISelf.includes(MOVE_CHARGE)) return MOVE_CHARGE; // 溜めも有効な選択肢
  }

  // デフォルトのフォールバック: 有効な手の中からランダムに選択 (溜めが最優先されることが多い)
  if (validMovesForAISelf.includes(MOVE_CHARGE)) return MOVE_CHARGE; // 溜めは常にリストに含まれるはず
  return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)]; // 万が一溜めがない場合の絶対的フォールバック
}
/**
 * AI2 (非学習AI、EvEモードの相手) の行動戦略を決定する (New)
 * @returns {string} AI2が選択した行動
 */
function ai2Strategy() {
  // AI2の視点: 自身のエネルギーは opponentEnergy, シールドは opponentShield
  //             相手(AI1)のエネルギーは playerEnergy, シールドは playerShield
  const validMovesForAI2 = getValidMovesForAI(opponentEnergy, opponentShield);

  // 簡単なランダム戦略: 有効な手の中からランダムに選択
  return validMovesForAI2[Math.floor(Math.random() * validMovesForAI2.length)];
}

/*===== 7. Q学習更新 =====*/
/**
 * Q学習テーブルを更新する
 * 1ゲームの終わりに呼び出され、そのゲームの軌跡に基づいてQ値を更新する
 * @param {number} reward ゲームの結果得られた報酬 (例: 勝利+1, 敗北-1, 引き分け0)
 */
function updateQ(reward){
  // 記録された軌跡 (状態sと行動aのペア) を逆順に辿りながらQ値を更新 (TD学習に近い形)
  qLearningTrajectory.forEach(({s: stateKey, a: action}) => {
    qLearningTable[stateKey] = qLearningTable[stateKey] || {}; // 状態キーがなければ初期化
    const qEntry = qLearningTable[stateKey][action] || {c: 0, v: 0}; // アクションキーがなければ初期化 (c: count, v: value)
    qEntry.c++; // 行動の試行回数をインクリメント
    qEntry.v += (reward - qEntry.v) / qEntry.c; // Q値の更新 (平均化)
    qLearningTable[stateKey][action] = qEntry;
  });
  // 更新されたQテーブルをローカルストレージに保存
  localStorage.setItem(Q_TABLE_LOCAL_STORAGE_KEY, JSON.stringify(qLearningTable));
  qLearningTrajectory.length = 0; // 次のゲームのために軌跡をクリア
}

/*===== 8. Firebase (PvP) =====*/
// PvPモードで使用するFirebase Realtime Database関連の処理
let currentRoomRef = null; // 現在参加しているFirebaseルームへの参照
let myPlayerRole = PLAYER_ROLE_P1; // 自分がプレイヤー1かプレイヤー2か

/**
 * 新しいPvPゲームルームを作成する
 */
function createRoom(){
  const roomId = Math.random().toString(36).slice(2, 7); // ランダムなルームIDを生成
  currentRoomRef = db.ref(FIREBASE_ROOMS_PATH + roomId); // ルームへの参照を作成
  // ルームの初期データを設定
  const initialRoomData = {
    [PLAYER_ROLE_P1]: { [FIREBASE_KEY_ENERGY]: 0, [FIREBASE_KEY_SHIELD]: PLAYER_INITIAL_SHIELD, [FIREBASE_KEY_MOVE]: null },
    [PLAYER_ROLE_P2]: { [FIREBASE_KEY_ENERGY]: 0, [FIREBASE_KEY_SHIELD]: PLAYER_INITIAL_SHIELD, [FIREBASE_KEY_MOVE]: null }
  };
  currentRoomRef.set(initialRoomData); // Firebaseに初期データを書き込み
  currentRoomRef.onDisconnect().remove(); // 接続が切れたらルームデータを削除 (ホストが落ちた場合など)
  myPlayerRole = PLAYER_ROLE_P1; // ルーム作成者はプレイヤー1
  roomIdDisplayElement.textContent = roomId; // UIにルームIDを表示
  if (currentGameMode === GAME_MODE_PVP) onlineMessageElement.textContent = UI_MSG_SHARE_ROOM_ID_P1; // P1にルームID共有を促す
  listenRoom(); // ルームデータの変更監視を開始

  // ルームIDをクリップボードにコピー
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(roomId).then(() => {
      console.log('Room ID copied to clipboard: ' + roomId);
      // オプション: ユーザーにコピー成功を通知するUIメッセージを表示
      //例: onlineMessageElement.textContent = `ルームID "${roomId}" をコピーしました！ ${UI_MSG_CHOOSE_ACTION}`;
    }).catch(err => {
      console.error('Failed to copy room ID: ', err);
    });
  } else {
    console.warn('Clipboard API not available.');
  }
}
/**
 * 既存のPvPゲームルームに参加する
 * @param {string} roomId 参加するルームのID
 */
function joinRoom(roomId){
  currentRoomRef = db.ref(FIREBASE_ROOMS_PATH + roomId); // 指定されたIDのルームへの参照を作成
  currentRoomRef.get().then(snapshot => { // ルームデータの存在確認
    if (!snapshot.exists()) { // ルームが存在しない場合
      onlineMessageElement.textContent = UI_MSG_ROOM_ID_NOT_FOUND;
      return;
    }
    myPlayerRole = PLAYER_ROLE_P2; // ルーム参加者はプレイヤー2
    roomIdDisplayElement.textContent = roomId; // UIにルームIDを表示
    if (currentGameMode === GAME_MODE_PVP) onlineMessageElement.textContent = UI_MSG_CHOOSE_ACTION; // 行動選択を促す
    listenRoom(); // ルームデータの変更監視を開始
  });
}
/**
 * Firebaseルームのデータ変更を監視し、ゲーム状態を同期する
 */
function listenRoom(){
  currentRoomRef.on('value', snapshot => { // 'value'イベントでルームデータの変更を全て取得
    const roomData = snapshot.val();
    if (!roomData) return; // ルームデータが存在しない場合は何もしない (ルームが削除された場合など)

    // 自分と相手のロールを決定
    const myRoomData = roomData[myPlayerRole];
    const opponentPlayerRole = myPlayerRole === PLAYER_ROLE_P1 ? PLAYER_ROLE_P2 : PLAYER_ROLE_P1;
    const opponentRoomData = roomData[opponentPlayerRole];

    // 自分と相手のデータが存在すれば、ローカルのゲーム状態を更新
    if (myRoomData && opponentRoomData) {
      playerEnergy = myRoomData[FIREBASE_KEY_ENERGY];
      playerShield = myRoomData[FIREBASE_KEY_SHIELD];
      opponentEnergy = opponentRoomData[FIREBASE_KEY_ENERGY];
      opponentShield = opponentRoomData[FIREBASE_KEY_SHIELD];
      showUI(); // UIを更新
    }

    // 両プレイヤーが行動を選択済みの場合
    if (myRoomData && opponentRoomData && myRoomData[FIREBASE_KEY_MOVE] && opponentRoomData[FIREBASE_KEY_MOVE]) {
      // Firebase上の両プレイヤーの行動データをクリア (次のターンに備える)
      // 注意: この処理は片方のクライアントのみで行うべき。両方で行うと競合の可能性。
      //       通常はホスト(P1)が行うか、トランザクションを使う。現状では両クライアントで実行される。
      currentRoomRef.child(PLAYER_ROLE_P1 + '/' + FIREBASE_KEY_MOVE).set(null);
      currentRoomRef.child(PLAYER_ROLE_P2 + '/' + FIREBASE_KEY_MOVE).set(null);
      
      if (currentGameMode === GAME_MODE_PVP) onlineMessageElement.textContent = ''; // メッセージをクリア (flashMessageで行動が表示されるため)
      
      // 行動を処理し、結果を判定
      processMoves(myRoomData[FIREBASE_KEY_MOVE], opponentRoomData[FIREBASE_KEY_MOVE], true);
      
      // 結果 (エネルギー、シールド) をFirebaseに反映
      // 注意: この更新も両クライアントから行われる可能性がある。
      //       processMovesの結果をローカルで計算した後、片方のクライアント(例: P1)のみが更新するのが望ましい。
      const updates = {};
      if (myPlayerRole === PLAYER_ROLE_P1) { // P1が更新する場合 (実際には両方実行される)
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`] = playerEnergy;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`] = playerShield;
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`] = opponentEnergy;
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`] = opponentShield;
      } else { // P2が更新する場合 (実際には両方実行される)
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`] = playerEnergy;
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`] = playerShield;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`] = opponentEnergy;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`] = opponentShield;
      }
      currentRoomRef.update(updates); // Firebaseデータを更新
    } else if (currentGameMode === GAME_MODE_PVP) { // Game continues, moves not yet resolved for both
      if (myRoomData) { // My data is available in the snapshot
        if (myRoomData[FIREBASE_KEY_MOVE]) {
          // I (current client) have already made a move.
          // handlePlayerTurn() sets UI_MSG_WAITING_OPPONENT.
          // No change needed here unless that message was somehow cleared.
          if (onlineMessageElement.textContent !== UI_MSG_WAITING_OPPONENT) {
            // This might occur if P2 joins after P1 moved, and P1's listener re-evaluates.
            // Or if P1 moved, P2 not joined, P1 should still see "waiting opponent" or "share room ID".
            // UI_MSG_WAITING_OPPONENT is generally correct if I've moved.
          }
        } else { // I (current client) have NOT made a move yet.
          if (!opponentRoomData) {
            // Opponent is not present in the room data yet.
            if (myPlayerRole === PLAYER_ROLE_P1) {
              onlineMessageElement.textContent = UI_MSG_SHARE_ROOM_ID_P1;
            } else { // I am P2, opponent (P1) data not yet seen.
              // joinRoom() set UI_MSG_CHOOSE_ACTION or UI_MSG_ROOM_ID_NOT_FOUND. This is fine.
              // No specific change here, initial message from joinRoom() persists.
            }
          } else { // Opponent IS present in the room data.
            if (!opponentRoomData[FIREBASE_KEY_MOVE]) {
              // Opponent is present AND has NOT made a move. (I also haven't moved)
              onlineMessageElement.textContent = UI_MSG_MATCH_READY_CHOOSE_ACTION;
            } else { // Opponent is present AND HAS made a move. (I haven't moved)
              onlineMessageElement.textContent = UI_MSG_MATCH_READY_CHOOSE_ACTION; // It's my turn.
            }
          }
        }
      } // else: myRoomData is not yet available. Initial messages from createRoom/joinRoom should persist.
    }
  });
}
/**
 * プレイヤーの行動をFirebaseに送信する
 * @param {string} move プレイヤーが選択した行動
 */
function sendMoveFirebase(move) {
  // 送信するデータには、行動だけでなく現在のエネルギーとシールドも含む
  // これは、相手が自分の行動選択時の状態を参照できるようにするためかもしれないが、
  // listenRoomで状態は同期されるため、moveだけでも良い場合もある。
  const moveData = {
    [FIREBASE_KEY_MOVE]: move,
    [FIREBASE_KEY_ENERGY]: playerEnergy, // 行動選択時のエネルギー
    [FIREBASE_KEY_SHIELD]: playerShield  // 行動選択時のシールド
  };
  currentRoomRef.child(myPlayerRole).update(moveData); // 自分のロールのデータを更新
}

/*===== 9. 勝敗判定ロジック =====*/
/**
 * プレイヤーと相手の行動に基づいて、ゲームの勝敗を判定し、結果メッセージを表示する
 * @param {string} playerMove プレイヤーの行動
 * @param {string} opponentMove 相手の行動
 * @returns {boolean} ゲームが終了した場合はtrue、それ以外はfalse
 */
function resolveMoves(playerMove, opponentMove) {
  let gameEnded = false; // ゲームが終了したかどうかのフラグ
  let playerWon = null;  // プレイヤーの勝利状態 (true: 勝利, false: 敗北, null: 引き分け・未決着)
  
  let p1DisplayName = "あなた";
  let p2DisplayName = (currentGameMode === GAME_MODE_PVE) ? UI_MSG_AI_OPPONENT_NAME : UI_MSG_PLAYER_OPPONENT_NAME;
  if (currentGameMode === GAME_MODE_EVE) {
    p1DisplayName = "AI 1"; // EvEモードでのプレイヤー1側表示名
    p2DisplayName = "AI 2"; // EvEモードでのプレイヤー2側表示名
  }
  // PvP時の相手表示名を英語に補正
  let opponentNameForMessage = p2DisplayName;
  if (currentGameMode === GAME_MODE_PVP && p2DisplayName === UI_MSG_PLAYER_OPPONENT_NAME && UI_MSG_PLAYER_OPPONENT_NAME === '相手') {
    opponentNameForMessage = 'Opponent';
  }

  const specialActionDisplayName = 'Special Action'; // 表示用の技名

  // Special Actionの判定 (最優先)
  if (playerMove === MOVE_SPECIAL_ACTION && opponentMove === MOVE_SPECIAL_ACTION) {
    playSound('soundKamehameha'); // 両者Special Actionの音
    flashMessage(`${specialActionDisplayName} vs ${specialActionDisplayName}! Energy -${SPECIAL_ACTION_ENERGY_COST}`, FLASH_WIN_LOSE_DURATION_MS, resetGame); // 長い表示時間
    gameEnded = true;
    playerWon = null; // Special Action同士の引き分け
  } else if (playerMove === MOVE_SPECIAL_ACTION && opponentMove !== MOVE_SPECIAL_ACTION) {
    playSound('soundKamehameha'); // Special Actionの音
    playSound('soundGameend');
    let winMsg = p1DisplayName === "あなた" ? `You win with ${specialActionDisplayName}!` : `${p1DisplayName} wins with ${specialActionDisplayName}!`;
    flashMessage(winMsg, FLASH_WIN_LOSE_DURATION_MS, resetGame); // 長い表示時間
    gameEnded = true;
    playerWon = true;
  } else if (opponentMove === MOVE_SPECIAL_ACTION && playerMove !== MOVE_SPECIAL_ACTION) {
    playSound('soundKamehameha'); // Special Actionの音
    playSound('soundGameend');
    let winMsg = `${opponentNameForMessage} wins with ${specialActionDisplayName}!`;
    flashMessage(winMsg, FLASH_WIN_LOSE_DURATION_MS, resetGame); // 長い表示時間
    gameEnded = true;
    playerWon = false;
  // 通常行動の判定 (Special Action以外)
  } else if (playerMove === MOVE_ATTACK && opponentMove === MOVE_CHARGE) {
    playSound('soundAttack');
    playSound('soundGameend');
    let winMsg = p1DisplayName === "あなた" ? "You win!" : `${p1DisplayName} wins!`;
    flashMessage(winMsg, FLASH_WIN_LOSE_DURATION_MS, resetGame); // 表示時間を指定
    gameEnded = true;
    playerWon = true;
  } else if (playerMove === MOVE_CHARGE && opponentMove === MOVE_ATTACK) {
    playSound('soundAttack');
    playSound('soundGameend'); // 長い表示時間
    let winMsg = `${opponentNameForMessage} wins!`;
    flashMessage(winMsg, FLASH_WIN_LOSE_DURATION_MS, () => { setTimeout(resetGame, RESOLVE_RESET_DELAY_MS); }); // 表示時間を指定
    gameEnded = true;
    playerWon = false;
  }
  // その他の組み合わせ (例: 攻撃vs防御、溜めvs溜めなど) はこの関数では勝敗を決定せず、ゲーム続行となる

  // PvEモードまたはEvEモード(AI1学習)でゲームが終了した場合、AIの連敗記録を更新し、Q学習テーブルを更新
  if (gameEnded && (currentGameMode === GAME_MODE_PVE || currentGameMode === GAME_MODE_EVE)) {
    // PvE: playerWonは人間プレイヤーの勝敗。AIの報酬は逆。
    // EvE: playerWonはAI1の勝敗。AI1の報酬はそのまま。
    let rewardForLearningAI = 0;
    if (playerWon === true) { // p1 (あなた or AI1) が勝利
      rewardForLearningAI = (currentGameMode === GAME_MODE_PVE) ? -1 : 1; // PvEならAIは負け(-1), EvEならAI1は勝ち(1)
    } else if (playerWon === false) { // p1 (あなた or AI1) が敗北
      rewardForLearningAI = (currentGameMode === GAME_MODE_PVE) ? 1 : -1; // PvEならAIは勝ち(1), EvEならAI1は負け(-1)
    } // playerWon === null (引き分け) の場合は rewardForLearningAI は 0 のまま

    updateQ(rewardForLearningAI);

    if (currentGameMode === GAME_MODE_PVE) { // PvEモードのAIの連敗記録のみ更新
      if (playerWon === true) { // 人間プレイヤーが勝った (AIが負けた)
        pveLoseStreak++;
      } else { // 人間プレイヤーが負けたか引き分け
        pveLoseStreak = 0;
      }
    }
  }
  return gameEnded; // 勝敗が決まったか否かを返す
}

/*===== 10. ターン処理 =====*/
/**
 * プレイヤーと相手の行動を処理し、リソースを更新し、結果を表示/判定する
 * @param {string} playerMove プレイヤーの行動
 * @param {string} opponentMove 相手の行動
 * @param {boolean} isOnlineGame PvPゲームかどうか (UIメッセージ制御用)
 */
function processMoves(playerMove, opponentMove, isOnlineGame) {
  /* 1. リソース更新 */
  let playerActionSoundPlayed = false;
  let opponentActionSoundPlayed = false;

  // エネルギー変動
  if (playerMove === MOVE_CHARGE) { playerEnergy++; playSound('soundTameru'); playerActionSoundPlayed = true; }
  if (opponentMove === MOVE_CHARGE) { opponentEnergy++; playSound('soundTameru'); opponentActionSoundPlayed = true; }
  if (playerMove === MOVE_ATTACK) playerEnergy--;
  if (opponentMove === MOVE_ATTACK) opponentEnergy--;
  if (playerMove === MOVE_SPECIAL_ACTION) playerEnergy -= SPECIAL_ACTION_ENERGY_COST;
  if (opponentMove === MOVE_SPECIAL_ACTION) opponentEnergy -= SPECIAL_ACTION_ENERGY_COST;
  // シールド変動
  if (playerMove === MOVE_BLOCK) playerShield--;
  if (opponentMove === MOVE_BLOCK) opponentShield--;

  // 防御成功時のエネルギー獲得
  if (playerMove === MOVE_BLOCK && opponentMove === MOVE_ATTACK) {
    playerEnergy++;
    playSound('soundGuard');
    playerActionSoundPlayed = true;
  }
  if (opponentMove === MOVE_BLOCK && playerMove === MOVE_ATTACK) {
    opponentEnergy++;
    playSound('soundGuard');
    opponentActionSoundPlayed = true;
  }

  // 攻撃がヒットした場合の音 (防御されず、かつSpecial Actionや攻撃vs溜めで勝敗が決まらない場合)
  if (playerMove === MOVE_ATTACK && opponentMove !== MOVE_BLOCK && opponentMove !== MOVE_SPECIAL_ACTION && opponentMove !== MOVE_CHARGE && !playerActionSoundPlayed) {
    playSound('soundAttack');
  }
  if (opponentMove === MOVE_ATTACK && playerMove !== MOVE_BLOCK && playerMove !== MOVE_SPECIAL_ACTION && playerMove !== MOVE_CHARGE && !opponentActionSoundPlayed) {
    playSound('soundAttack');
  }
  // 行動名の表示用マッピング
  const MOVE_DISPLAY_NAMES = {
    [MOVE_ATTACK]: '攻撃',
    [MOVE_BLOCK]: '防御',
    [MOVE_CHARGE]: '溜め',
    [MOVE_SPECIAL_ACTION]: 'Special Action'
  };
  let p1DisplayName = "あなた";
  let p2DisplayName = (currentGameMode === GAME_MODE_PVE) ? UI_MSG_AI_OPPONENT_NAME : UI_MSG_PLAYER_OPPONENT_NAME;
  if (currentGameMode === GAME_MODE_EVE) {
    p1DisplayName = "AI 1";
    p2DisplayName = "AI 2";
  }

  // 新しい行動履歴ログに記録
  currentTurnNumber++;
  const logMessage = `Turn ${currentTurnNumber}: ${p1DisplayName} - ${MOVE_DISPLAY_NAMES[playerMove]} | ${p2DisplayName} - ${MOVE_DISPLAY_NAMES[opponentMove]}`;
  if (turnHistoryLogElement) {
      turnHistoryLogElement.innerHTML += `<div>${logMessage}</div>`;
      turnHistoryLogElement.scrollTop = turnHistoryLogElement.scrollHeight; // 常に最新のログが見えるようにスクロール
  }
  // 2. 行動結果をflashメッセージで表示し、そのコールバックで勝敗判定とUI更新を行う
  flashMessage(`${p1DisplayName}:${MOVE_DISPLAY_NAMES[playerMove]}／${p2DisplayName}:${MOVE_DISPLAY_NAMES[opponentMove]}`, FLASH_DEFAULT_DURATION_MS, () => {
    const gameJustEnded = resolveMoves(playerMove, opponentMove); // 勝敗判定を実行し、結果を取得

    if (gameJustEnded) {
      // 勝敗が決まった場合:
      // resolveMoves内で勝利/敗北メッセージのflashMessageが呼ばれ、
      // そのflashMessageのコールバックでresetGameが呼ばれる。
      // resetGame内でEvEモードの次のターンがスケジュールされるため、ここでは何もしない。
    } else {
      // 勝敗が決まらなかった場合 (ゲーム続行):
      showUI();
      if (currentGameMode === GAME_MODE_PVP && isOnlineGame) {
        // PvPモードでゲームが続く場合、次の行動を促すメッセージを表示
        onlineMessageElement.textContent = UI_MSG_MATCH_READY_CHOOSE_ACTION;
      } else if (currentGameMode === GAME_MODE_PVE || currentGameMode === GAME_MODE_EVE) {
        // PvE/EvEモードでゲームが続く場合 (勝敗未決着)、AIに報酬0でQ学習を更新
        // (Special Action同士以外の引き分けや、攻撃vs防御などの場合など)
        updateQ(0);
        if (currentGameMode === GAME_MODE_EVE && isEveGameRunning) {
          setTimeout(runEveGameTurn, EVE_TURN_DELAY_MS); // 次のターンへ
        }
      }
    }
  });
}

/**
 * プレイヤーのターンを処理する (行動ボタンクリック時に呼び出される)
 * @param {string} playerMove プレイヤーが選択した行動
 */
function handlePlayerTurn(playerMove) {
  playSound('soundPushbutton'); // ボタンクリック音を最初に再生
  if (isInputLocked || currentGameMode === GAME_MODE_EVE) return; // 入力ロック中またはEvEモード中は何もしない

  // 行動の妥当性チェック (エネルギー、シールド残量)
  if (playerMove === MOVE_ATTACK && playerEnergy === 0) { resultMessageElement.textContent = UI_MSG_INSUFFICIENT_ENERGY; return; }
  if (playerMove === MOVE_SPECIAL_ACTION && playerEnergy < SPECIAL_ACTION_ENERGY_COST) { resultMessageElement.textContent = UI_MSG_INSUFFICIENT_ENERGY; return; }
  if (playerMove === MOVE_BLOCK && playerShield === 0) { resultMessageElement.textContent = UI_MSG_INSUFFICIENT_SHIELD; return; }
  resultMessageElement.textContent = ''; // エラーメッセージをクリア

  if (currentGameMode === GAME_MODE_PVE) { // PvEモードの場合
    const aiMove = aiStrategy(); // AIの行動を決定
    // AIの行動がQ学習対象 (Special Action以外) であれば、軌跡に追加
    if (aiMove !== MOVE_SPECIAL_ACTION) {
      qLearningTrajectory.push({ s: getCurrentStateKey(), a: aiMove });
    }
    // プレイヤーとAIの行動を処理
    processMoves(playerMove, aiMove, false);
  } else { // PvPモード
    sendMoveFirebase(playerMove); // 選択した行動をFirebaseに送信
    lockInput(); // 相手の行動を待つ間、入力をロック
    onlineMessageElement.textContent = UI_MSG_WAITING_OPPONENT; // 待機メッセージを表示
  }
}

/*===== 11. ゲームリセット処理 =====*/
/**
 * ゲーム状態を初期値にリセットする
 */
function resetGame() {
  currentTurnNumber = 0; // ターン数をリセット
  if (turnHistoryLogElement) {
    turnHistoryLogElement.innerHTML = ""; // 行動履歴ログをクリア
  }

  playerEnergy = 0; opponentEnergy = 0;
  playerShield = PLAYER_INITIAL_SHIELD; opponentShield = PLAYER_INITIAL_SHIELD;
  showUI(); // UIを初期状態に更新
  resultMessageElement.textContent = ''; // 結果メッセージをクリア

  if (currentGameMode === GAME_MODE_EVE) {
    onlineMessageElement.textContent = UI_MSG_EVE_MODE_ACTIVE;
    lockInput(); // EvEモードでは常に入力をロック
    // showUI()が呼ばれることでボタンは非表示になる
    if (isEveGameRunning) { // EvEゲームループが継続中の場合のみ次のターンをスケジュール
        setTimeout(runEveGameTurn, EVE_TURN_DELAY_MS);
    }
  } else if (currentGameMode === GAME_MODE_PVP) {
    onlineMessageElement.textContent = currentRoomRef ? UI_MSG_CHOOSE_ACTION : '';
    unlockInput(); // PvPではリセット後入力解除
  } else { // PvE
    onlineMessageElement.textContent = '';
    unlockInput(); // PvEではリセット後入力解除
  }
  // PvEの場合、qLearningTrajectoryはupdateQ関数内でクリアされる
  // pveLoseStreakは勝敗決定時に更新されるので、ここではリセットしない
}

/*===== 11a. EvEゲームループ (New) =====*/
/**
 * EvEモードのゲームループを開始する
 */
function startEveGameLoop() {
  if (currentGameMode !== GAME_MODE_EVE) return;
  isEveGameRunning = true;
  // opponentNameDisplayElement は resetGame -> showUI で設定される
  // onlineMessageElement も resetGame で設定される
  resetGame(); // ゲーム状態をリセットして開始 (resetGame内で入力ロック等が行われる)
  runEveGameTurn(); // 最初のターンを開始
}

/**
 * EvEモードの1ターンを実行する
 */
function runEveGameTurn() {
  if (!isEveGameRunning || currentGameMode !== GAME_MODE_EVE) {
    isEveGameRunning = false; // 安全停止
    return;
  }

  // AI1 (player側, 学習AI) の行動決定 - ゲームが終了していない場合のみ
  const ai1Move = aiStrategy(); // 既存のaiStrategyを使用
  // AI1の行動がQ学習対象であれば軌跡に追加
  // getCurrentStateKeyはplayerEnergy, opponentEnergyを参照するので、AI1の視点になる
  if (AI_ACTIONS_FOR_Q_LEARNING.includes(ai1Move)) {
    qLearningTrajectory.push({ s: getCurrentStateKey(), a: ai1Move });
  }

  // AI2 (opponent側, 非学習AI) の行動決定
  const ai2Move = ai2Strategy();

  processMoves(ai1Move, ai2Move, false); // isOnlineGame = false
}

/*===== 12. UIボタンイベントリスナー =====*/
chargeButtonElement.onclick = () => handlePlayerTurn(MOVE_CHARGE);
blockButtonElement.onclick = () => handlePlayerTurn(MOVE_BLOCK);
attackButtonElement.onclick = () => handlePlayerTurn(MOVE_ATTACK);
specialActionButtonElement.onclick = () => handlePlayerTurn(MOVE_SPECIAL_ACTION);

// PvEモード選択ボタン
pveModeButtonElement.onclick = () => {
  playSound('soundPushbutton');
  isEveGameRunning = false; // EvEループを停止
  currentGameMode = GAME_MODE_PVE;
  onlinePanelElement.style.display = 'none';
  // player1NameDisplayElement.textContent = "あなた"; // showUIで設定される
  // player2NameDisplayElement.textContent = UI_MSG_AI_OPPONENT_NAME; // showUIで設定される
  if (currentRoomRef) { // もしPvPルームに参加中なら
    currentRoomRef.off(); // Firebaseのリスナーを解除
    currentRoomRef = null; // ルーム参照をクリア
  }
  onlineMessageElement.textContent = ''; // PvP関連のメッセージをクリア
  allActionButtons.forEach(btn => btn.style.display = 'inline-block'); // ボタン再表示
  resetGame(); // ゲーム状態をリセット
};
// EvEモード選択ボタン (New)
eveModeButtonElement.onclick = () => {
  playSound('soundPushbutton');
  isEveGameRunning = false; // 念のため一度停止
  currentGameMode = GAME_MODE_EVE;
  onlinePanelElement.style.display = 'none';
  // 名前の設定はshowUIに任せる
  // HTML側でp1Name, p2Nameも変更済みなので、ここではopponentNameDisplayElementのみで良い
  if (currentRoomRef) { // もしPvPルームに参加中なら
    currentRoomRef.off(); // Firebaseのリスナーを解除
    currentRoomRef = null; // ルーム参照をクリア
  }
  // onlineMessageElement とボタン表示/ロックは resetGame と showUI で処理される
  // resetGame(); // startEveGameLoop内で呼ばれるのでここでは不要
  startEveGameLoop(); // EvEゲームループを開始
};
// PvPモード選択ボタン
pvpModeButtonElement.onclick = () => {
  playSound('soundPushbutton');
  isEveGameRunning = false; // EvEループを停止
  currentGameMode = GAME_MODE_PVP;
  onlinePanelElement.style.display = 'block';
  // player1NameDisplayElement.textContent = "あなた"; // showUIで設定される
  // player2NameDisplayElement.textContent = UI_MSG_PLAYER_OPPONENT_NAME; // showUIで設定される
  // ボタン表示はresetGame -> showUI で処理される
  allActionButtons.forEach(btn => btn.style.display = 'inline-block'); // ボタン再表示
  resetGame(); // ゲーム状態をリセット (ルームIDなどはリセットされない)
};
// ルーム作成ボタン
createRoomButtonElement.onclick = createRoom;
// ルーム参加ボタン
joinRoomButtonElement.onclick = () => joinRoom(joinRoomIdInputElement.value.trim()); // 入力されたIDでルームに参加

/*===== 13. 初期化 =====*/
// ゲーム開始時に一度だけ実行
resetGame(); // ゲームを初期状態にリセットして開始
