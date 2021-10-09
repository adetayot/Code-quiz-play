// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract CodeQuizDapp {
  address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
  
  uint internal questionsIndex;

  address internal admin;

  uint internal fee;

  uint internal rewardAmount;

  uint internal rebootTime;

  string[] internal users;

  uint internal benchmarkScore;

  uint internal noOfQuizAttempts;

  uint internal successfulAttempts;

  enum quizState {
    NOT_STARTED,
    IN_PLAY
  }

  struct question {
    string questionTitle;
    string[] options;
    string answer;
  }

  struct userHistory {
    string userName;
    uint userScore;
    uint userRebootTime;
    bool userPassed;
    uint noOfTimePlayed;
    quizState userState;
  }

  mapping (uint => question) internal questions;
  mapping (string => address) internal userRecords;
  mapping (address => bool) internal isUser;
  mapping (address => userHistory) internal userHistoryRecords;


  constructor (uint256 _gameFEE, uint256 _rewardAmount, uint _usersRebootTime, uint _benchMarkScore) {
    admin = msg.sender;
    fee = _gameFEE * (10**18);
    rewardAmount = _rewardAmount * (10**18);
    rebootTime = _usersRebootTime * 1 hours;
    benchmarkScore = _benchMarkScore;
  }


  modifier onlyAdmin() {
    require(msg.sender == admin, "Authorization Required");
    _;
  } 

  modifier ensureState(quizState _state) {
    require(userHistoryRecords[msg.sender].userState == _state);
    _;
  }

  modifier checkUnique(string memory _userName) {
    require(userRecords[_userName] == address(0), "User Name already exists in records");
    _;
  } 

  modifier checkUser() {
    require(isUser[msg.sender]==false, "You already have an account");
    _;
  }

  modifier checkTimeLimit() {
    require((userHistoryRecords[msg.sender].userRebootTime == 0) || (block.timestamp > userHistoryRecords[msg.sender].userRebootTime), "Sorry, you can not take the quiz now. Please try again later.");
    _;
  }

  function createQuestion (
    string memory _questionTitle,
    string[] memory _options,
    string memory _answer
  ) onlyAdmin public {
    questions[questionsIndex] = question(
      _questionTitle,
      _options,
      _answer
    );
    questionsIndex++;
  }

  function getQuestions(uint _index) public view returns(
    string memory,
    string[] memory,
    string memory
  ){
    return (
      questions[_index].questionTitle,
      questions[_index].options,
      questions[_index].answer
    );
  }

  function createUser(string  memory _userName) public checkUnique(_userName) checkUser(){
    userRecords[_userName] = msg.sender;
    isUser[msg.sender] = true;
    users.push(_userName);

    uint _userScore = 0;

    uint _userTime = 0;

    bool _userPassed = false;

    uint _noOfTimesPlayed = 0;

    userHistoryRecords[msg.sender] = userHistory(
      _userName,
      _userScore,
      _userTime,
      _userPassed,
      _noOfTimesPlayed,
      quizState.NOT_STARTED
    );
  }

  function startQuiz() public checkTimeLimit() ensureState(quizState.NOT_STARTED) payable{
    // user pays fee and starts quiz, quiz state is set to in-play
    require(
      IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, address(this), fee),
      "Transfer failed"
    );

    userHistoryRecords[msg.sender].userState = quizState.IN_PLAY;
    userHistoryRecords[msg.sender].userRebootTime = block.timestamp + rebootTime;
    noOfQuizAttempts++;
    // as a start users can only take quiz once within the time limit set by the admin.
    // multiple quizzes will be added later on.
    // each quiz having their own fee and rewards system
  }

  function endQuiz(uint _score) public ensureState(quizState.IN_PLAY) {
    //handles payments if user wins and reverts user game state back to not_started while keeping record of the user game data
    userHistoryRecords[msg.sender].userState = quizState.NOT_STARTED;
    userHistoryRecords[msg.sender].userScore = _score;

    if(_score >= benchmarkScore){
      require(
        IERC20Token(cUsdTokenAddress).transfer(msg.sender, rewardAmount),
        "Transfer failed"
      );
      userHistoryRecords[msg.sender].userPassed = true;
    }else{
      userHistoryRecords[msg.sender].userPassed = false;
    }

    successfulAttempts++;
  }

  function getUserResult() public view returns(bool) {
    return(userHistoryRecords[msg.sender].userPassed);
  }
  
  function getUsers() public view returns(string[] memory){
    return users;
  }

  function getUserScoresRecord(string memory _userName) public view returns (
    address,
    uint,
    uint
  ){
    address _userAddress = userRecords[_userName];

    uint score = userHistoryRecords[_userAddress].userScore;

    uint _noOfTimesPlayed = userHistoryRecords[_userAddress].noOfTimePlayed;
    
    return (
      _userAddress,
      score,
      _noOfTimesPlayed
    );
  }

  function getUserGameState() public view returns (
    quizState
  ){
    return(userHistoryRecords[msg.sender].userState);
  }

  function getUserRebootTime() public view returns(uint) {
    return(userHistoryRecords[msg.sender].userRebootTime);
  }

  function isUserExist() public view returns(bool) {
    return(isUser[msg.sender]);
  }

  function getFee() public view returns(uint256) {
    return(fee);
  }

  function canUserPlay() public view returns(bool) {
    if(block.timestamp > userHistoryRecords[msg.sender].userRebootTime) {
      return true;
    }else{
      return false;
    }
  }

  function getQuizAttempts() public view returns(uint){
    return noOfQuizAttempts;
  }

  function getSuccessfulQuizAttempts() public view returns(uint){
    return successfulAttempts;
  }
  function isAdmin() public view returns(bool) {
    if(msg.sender == admin) {
      return true;
    }else{
      return false;
    }
  }

  function getQuestionsIndex() public view returns(uint) {
    return questionsIndex;
  }

  // Admin Functions

  function FundQuiz(uint256 _amount) onlyAdmin public returns(uint256) {
    require(
      IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, address(this), _amount),
      "Transfer failed"
    );

    return(
      IERC20Token(cUsdTokenAddress).balanceOf(address(this))
    );
  }

  function getBalance() onlyAdmin public view returns(uint256){
    return IERC20Token(cUsdTokenAddress).balanceOf(address(this));
  }

  function withdrawFunds(uint256 _amount) onlyAdmin public returns(uint256) {
    require(IERC20Token(cUsdTokenAddress).balanceOf(address(this)) >= _amount, "Insuffcient Balance");
    require(IERC20Token(cUsdTokenAddress).transfer(payable(admin), _amount),"Withdrawal failed");
    
    return(
      IERC20Token(cUsdTokenAddress).balanceOf(address(this))
    );
  }

}