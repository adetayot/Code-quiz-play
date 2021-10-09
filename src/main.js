import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import codeQuizDappAbi from '../contract/codeQuizDapp.abi.json'
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18
const CQDContractAddress = "0x37CF503215c15d41218aE24D1626659b0b574Ca3"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let contract
let kit
let userRebootTime
let isAdmin
let questions = []
let users = []

function notification(_text) {
 $('#notification').removeClass('ishidden');
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}

const connectCeloWallet = async function () {
    notification("⚠️ Please approve this DApp to use it.")
    try {
      await window.celo.enable()

      const web3 = new Web3(window.celo)

      kit = newKitFromWeb3(web3)
  
      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]
      
      contract = new kit.web3.eth.Contract(codeQuizDappAbi, CQDContractAddress)
      notificationOff();
      await getBalance();
      await getQuestions();    

    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
 
}

const getBalance = async function () {

    isAdmin = await contract.methods.isAdmin().call();

    if(isAdmin){
        const Balance = await contract.methods.getBalance().call()
        const _balance = new BigNumber(Balance).shiftedBy(-ERC20_DECIMALS).toFixed(2)
        document.querySelector("#GameBalance").textContent = _balance
        $('#player').addClass('ishidden')
        $('#Admin').removeClass('ishidden')
        $('#addQuestionBtn').removeClass('ishidden')
    }else{
        const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
        const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
        document.querySelector("#balance").textContent = cUSDBalance
    }

    $('#quizSection').removeClass('ishidden')
    
}

const handleConnectionModal = async function () {
    if (window.celo) {
        $("#connectionModal").modal('show');
    } else {
        $("#errorModal").modal('show');
    }
    setTimeout(function() {
        $('#cover-spin').hide()
    }, 1500);
      
}

document.querySelector("#connectModal").addEventListener("click", async (e) => {
    $('#cover-spin').show(0)
   await connectCeloWallet();
})

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(CQDContractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}

// Variables

var score = 0;
var questionIndex = 0;
var currentTime = document.querySelector("#currentTime");
var timer = document.querySelector("#startTimer");
var questionsSection = document.querySelector("#questionsSection");
// Quiz time remaining

var secondsLeft = 75;

// Interval time

var holdInterval = 0;

// Penalty 10 seconds

var penalty = 10;

// Pass Score is 40 seconds

// Quiz questions array

// var questions = [
//     {
//         title: "How do you create a function in JavaScript?",
//         options: ["function myFunction()", "callFunction()", "var myFunction", "myFunction()"],
//         answer: "function myFunction()"
//     },
//     {
//         title: "How do you create an IF statement for executing some code if 'i' is NOT equal to 5?",
//         options: ["if i=! 5 then", "if (i || 5)", "if (i != 5)", "if (i % 5)"],
//         answer: "if (i != 5)"
//     },
//     {
//         title: "How do you find the number with the highest value of x and y?",
//         options: ["Math.ceil(x ,y)", "Math.max(x, y)", "Math.round(x, y)", "Math.highest(x, y)"],
//         answer: "Math.max(x, y)"
//     },
//     {
//         title: "Which event occurs when the user clicks on an HTML element?",
//         options: ["onmouseclick", "onpush", "onclick", "mousepress"],
//         answer: "onclick"
//     },
//     {
//         title: "How does a FOR loop start?",
//         options: ["for (i < 0; i ++ 5; i+-)", "for (i = 0; i % 5; [i])", "for (i = 0; i || 5; i+)", "for (i = 0; i < 5; i++)"],
//         answer: "for (i = 0; i < 5; i++)"
//     },

// ];

// GET Questions FROM the chain
const getQuestions = async function() {
    notification("⌛ Loading...")
    const _questions = []
    const _questionIndex = await contract.methods.getQuestionsIndex().call()
    for (let i = 0; i < _questionIndex; i++) {
      let _question = new Promise(async (resolve, reject) => {
        let p = await contract.methods.getQuestions(i).call()
        resolve({
          title: p[0],
          options: p[1],
          answer: p[2],
        })
      })
      _questions.push(_question)
    }
    questions = await Promise.all(_questions)

    notificationOff()

    setTimeout(function() {
        $('#cover-spin').hide()
      }, 1000);
  }


// Create ul for quiz questions

var ulEl = document.createElement("ul");

if (timer !== null) {
    timer.addEventListener("click", async function () {
        $('#cover-spin').show(0)
       const isAlreadyUser = await contract.methods.isUserExist().call();
       const userState = await contract.methods.getUserGameState().call();
       userRebootTime = await contract.methods.getUserRebootTime().call();
       const canUserPlay = await contract.methods.canUserPlay().call();
       if (isAlreadyUser){
           if(userState == 0 && canUserPlay ) {
                await quizStart()
           }else if (userState == 1){
                await rebootQuiz()
           }else{
                notification('⚠️ Sorry You are allowed to play the quiz once a day.')
                setTimeout(function() {
                    $('#cover-spin').hide()
                }, 5000)
                setTimeout(function() {
                    notificationOff();
                }, 5000)
           }
       }else{
            await setUser();
       }
    });
}

async function setUser() {
    // Make this the first thing the person has to do, to allow mapping of address on the quiz database
    // User prompted to enter intials

    questionsSection.innerHTML = "";

    var enterInitials = document.createElement("initials");
    enterInitials.setAttribute("id", "enterInitials");
    enterInitials.textContent = "Enter your User Name: ";

    questionsSection.appendChild(enterInitials);

    // Enter initials

    var userInput = document.createElement("input");
    userInput.setAttribute("type", "text");
    userInput.setAttribute("id", "initials");
    userInput.textContent = "";

    questionsSection.appendChild(userInput);

    // Submit user information

    var initialsSubmit = document.createElement("button");
    initialsSubmit.setAttribute("class", "btn btn-light");
    initialsSubmit.setAttribute("type", "submit");
    initialsSubmit.setAttribute("id", "submit");
    initialsSubmit.textContent = "Submit";

    questionsSection.appendChild(initialsSubmit);

    setTimeout(function() {
        $('#cover-spin').hide()
      }, 1000);

    // Event listener to capture initials and send to the blockchain

    initialsSubmit.addEventListener("click", async (e) => {
        e.preventDefault();
        var initials = userInput.value.toUpperCase();
        questionsSection.innerHTML = "";
        if (!initials) {
            document.querySelector("#submit").textContent = "Enter a valid value!";
        }
        else {
            $('#cover-spin').show(0)
            let userSignedUp = true;
            notification(`⌛ Adding New User "${initials}"...`)
            try {
                const result = await contract.methods
                    .createUser(initials)
                    .send({ from: kit.defaultAccount })
            }catch (error) {
                notification(`⚠️ ${error}.`)
                userSignedUp = false;
            }

            if (userSignedUp) {
                await quizStart()
            }else{
                notification('⚠️ Please Complete SignUp process to continue Quiz')
            }
        }

    });
}


async function quizStart() {
    $('#cover-spin').show(0)
    // ensure that the questions are more than 5, before allowing.
    if(questions.length >= 5){
        notification("⌛ Waiting for quiz fee payment approval...")
        const fee = await contract.methods.getFee().call()
        let approved = true;
        try {
        await approve(fee)
        } catch (error) {
        notification(`⚠️ ${error}.`)
        approved = false;
        }

        if (approved) {
            let paidFee = true;
            notification(`⌛ Starting Quiz...`)
            try {
                const result = await contract.methods
                    .startQuiz()
                    .send({ from: kit.defaultAccount })
                    getBalance()
            }catch (error) {
                notification(`⚠️ ${error}.`)
                paidFee = false
            }

            if(paidFee){
                setTimeout(function() {
                    $('#cover-spin').hide()
                }, 500);

                notificationOff();

                if (holdInterval === 0) {
                    holdInterval = setInterval(function () {
                        secondsLeft--;
                        currentTime.textContent = "Time Left: " + secondsLeft + " seconds";
                        
                    if (secondsLeft <= 0) {
                        clearInterval(holdInterval);
                            quizComplete();
                            currentTime.textContent = "OOOPS! OUT OF TIME!";
                        }
                    }, 1000);
                }
                render(questionIndex);
            }else{
                setTimeout(function() {
                    $('#cover-spin').hide()
                }, 1000);
                notification('⚠️ Please complete Transaction to start quiz')
            }
        
        } else {
            setTimeout(function() {
                $('#cover-spin').hide()
            }, 1000);
            notification('⚠️ Please approve payment to start quiz')
        }
    }else{
        notification('⚠️ Sorry, there are no questions available at the moment')
        setTimeout(function() {
            $('#cover-spin').hide()
        }, 1000)
    }
    setTimeout(function() {
        notificationOff()
    }, 5000)
       
}

async function rebootQuiz() {

    notification('⚠️ Seems you lost your previous session.')
    document.querySelector("#questionsSection").innerHTML = "";
    setTimeout(function() {
        $('#cover-spin').hide()
      }, 1000);

    // Create h1, p elements

     var h3El = document.createElement("h1");
     h3El.setAttribute("id", "msg");
     h3El.className = "center"
     h3El.textContent = "See how much time remains before you can start a new session"
 
     questionsSection.appendChild(h3El);
 
     var time = document.createElement("p");
     time.setAttribute("id", "_time");
     questionsSection.appendChild(time);

     dispTime(userRebootTime)

     // Retake quiz button
     var restartQuiz = document.createElement("button");
     restartQuiz.setAttribute("class", "btn btn-light");
     restartQuiz.setAttribute("type", "submit");
     restartQuiz.setAttribute("id", "submit");
     restartQuiz.textContent = "Restart Quiz";
 
     questionsSection.appendChild(restartQuiz);
    
     setTimeout(function() {
        notificationOff()
     },5000)
     
    restartQuiz.addEventListener("click", async (e) => {
        await quizStart()
    });

}

function dispTime(time) {
    // Set the date we're counting down to
    var countDownTime = new Date(time*1000)

    // Update the count down every 1 second
    var x = setInterval(function() {

    // Get today's date and time
    var now = new Date().getTime();
        
    // Find the distance between now and the count down date
    var distance = countDownTime - now;
        
    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
    // Output the result in element.
    if(document.getElementById("_time") == null){
        clearInterval(x);
        return;
    }

    document.getElementById("_time").innerHTML = days + "d " + hours + "h "
    + minutes + "m " + seconds + "s ";
        
    // If the count down is over, write some text 
    if (distance < 0) {
        clearInterval(x);
        document.getElementById("_time").innerHTML = "You can restart quiz now";
    }
    }, 1000);
}

// Renders questions

async function render(questionIndex) {

    // Clears existing data 

    questionsSection.innerHTML = "";
    ulEl.innerHTML = "";

    for (var i = 0; i < questions.length; i++) {
        // Appends question title only
        var userQuestion = questions[questionIndex].title;
        var userChoices = questions[questionIndex].options;
        questionsSection.textContent = userQuestion;
    }
    // New for each for question

    userChoices.forEach(function (newItem) {
        var listItem = document.createElement("li");
        listItem.textContent = newItem;
        questionsSection.appendChild(ulEl);
        ulEl.appendChild(listItem);
        listItem.addEventListener("click", (compare));
    })
    
}
// Event to compare options with answer

function compare(event) {
    var element = event.target;

    if (element.matches("li")) {

        var answerDiv = document.createElement("div");
        answerDiv.setAttribute("id", "answerDiv");

        // Correct condition 

        if (element.textContent == questions[questionIndex].answer) {
            score++;
            answerDiv.textContent = "Correct! The answer is:  " + questions[questionIndex].answer;
        }
        else {

            // Will deduct 10 seconds off secondsLeft for wrong answers

            secondsLeft = secondsLeft - penalty;
            answerDiv.textContent = "Wrong! The correct answer is:  " + questions[questionIndex].answer;
        }

    }
    // Question Index determines number question user is on 
    // Append page with user information

    questionIndex++;

    if (questionIndex >= questions.length) {
        quizComplete();
        answerDiv.textContent = "Finished!" + " " + "You got  " + score + "/" + questions.length + " Correct!";
    }
    else {
        render(questionIndex);
    }
    questionsSection.appendChild(answerDiv);

}
// Quiz complete clear questionsSection

function quizComplete() {
    questionsSection.innerHTML = "";
    currentTime.innerHTML = "";

    // Create h1, p elements

    var h1El = document.createElement("h1");
    h1El.setAttribute("id", "h1El");
    h1El.textContent = "Quiz Complete!"

    questionsSection.appendChild(h1El);

    var pEl = document.createElement("p");
    pEl.setAttribute("id", "pEl");

    questionsSection.appendChild(pEl);

    // Calculates time remaining and creates score

    if (secondsLeft >= 0) {
        var timeRemaining = secondsLeft;
        var pEl2 = document.createElement("p");
        clearInterval(holdInterval);
        pEl.textContent = "Your final score is: " + timeRemaining;

        questionsSection.appendChild(pEl2);
    }
    
        var score = timeRemaining;
        // initiate endquiz function
        endQuiz(score);
}

async function endQuiz(score){
    notification(`⌛ Checking your reward"...`)
    try {
        const result = await contract.methods
        .endQuiz(score)
        .send({ from: kit.defaultAccount })
        
        const userResult = await contract.methods.getUserResult().call()

        if(userResult){
            notification(`🎉 Congratulations you won, check your balance for reward.`)
        }else{
            notification(`Sorry better luck next time.`)
        }
        getBalance()
    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
}

async function showScoreBoard() {

    // Clearing HTML at #questionSection 

    document.querySelector("#questionsSection").innerHTML = "";

    // Create High Scores page heading
    var pre = document.createElement("pre");
    pre.setAttribute("id", "h2El")
    pre.textContent = " SCORE-BOARD"
    pre.className = "fs-1"
    questionsSection.className = "scoreBoard"
    
    // Append element to page
    questionsSection.appendChild(pre);

    let userScores = []
    users = await contract.methods.getUsers().call()

    const _userArray= []    

    for (let i = 0; i < users.length; i++) {
        let _user= new Promise(async (resolve, reject) => {
        let q = await contract.methods.getUserScoresRecord(users[i]).call()
        resolve({
          user: users[i],
          address: q[0],
          score: q[1],
          noOfTimesPlayed: q[2],
        })
      })
      _userArray.push(_user) 
    }

    userScores = await Promise.all(_userArray)


    const quizAttempts = await contract.methods.getQuizAttempts().call()
    const successfulQuizAttempts = await contract.methods.getSuccessfulQuizAttempts().call()

    if (quizAttempts != 0 && successfulQuizAttempts != 0) {
        var ul = document.querySelector("#scoreBoardUl")
        ul.innerHTML = "";
        for (let i=0; i < userScores.length; i++) {
            if(userScores[i].noOfTimesPlayed == 0){
                continue;
            }
            var li2 = document.createElement("li")
            li2.innerHTML = scoreBoardTemplate(userScores[i])
            ul.appendChild(li2);
        }
    }else{
        notification('No available scores yet')
        setTimeout(function(){
            notificationOff();
        }, 5000)
    }
}

function scoreBoardTemplate(_user){
    return  `
        <div class="card-body p-4 position-relative" style="height:max-content">
            <div class="translate-middle-y d-flex justify-content-center" id="identicon">
                ${identiconTemplate(_user.address)} &ensp;
                <span style="padding-top: 5px">${_user.user + "  --  " + _user.score}</span>
            </div>
        <div>
    `
}
function identiconTemplate(_address) {
    const icon = blockies
      .create({
        seed: _address,
        size: 8,
        scale: 16,
      })
      .toDataURL()
  
    return `
    <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0" style="margin-top:10px">
      <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
          target="_blank">
          <img src="${icon}" width="36" alt="${_address}">
      </a>
    </div>
    `
}

document
.querySelector("#showScoreBoard")
.addEventListener("click", async (e) => {
    $('#cover-spin').show(0)
    await showScoreBoard()
    setTimeout(function() {
        $('#cover-spin').hide()
      }, 1500);
})


document
.querySelector("#withdrawalBtn")
.addEventListener("click", async (e) => {
  $('#cover-spin').show(0)
  const withdrawalAmount = new BigNumber(document.getElementById("amountToWithdraw").value).shiftedBy(ERC20_DECIMALS).toString()

  notification(`⌛ Withdrawing ${new BigNumber(withdrawalAmount).shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD to wallet`)
  try {
    const result = await contract.methods
      .withdrawFunds(withdrawalAmount)
      .send({ from: kit.defaultAccount })
    notification(`🎉 Withdrawal Successful.`)
    getBalance()
    setTimeout(function() {
        $('#cover-spin').hide()
      }, 500);
  } catch (error) {
    notification(`⚠️ ${error}.`)
  }
  setTimeout(function() {
    notificationOff()
  }, 1000);
  
})

document
.querySelector("#depositBtn")
.addEventListener("click", async (e) => {
  $('#cover-spin').show(0)
  const amount = document.getElementById("amount").value
  const depositAmount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS).toString()
  notification("⌛ Waiting for payment approval...")
  let approved = true;
  try {
    await approve(depositAmount)
  } catch (error) {
    notification(`⚠️ ${error}.`)
    approved = false;
  }

  if(approved){
    notification(`⌛ Depositing ${amount} cUSD to contract`)
    try {
        const result = await contract.methods
        .FundQuiz(depositAmount)
        .send({ from: kit.defaultAccount })
        notification(`🎉 Funding Successful.`)
        getBalance()
        setTimeout(function() {
            $('#cover-spin').hide()
        }, 1000);
    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
  }else {
    setTimeout(function() {
        notification('⚠️ Please approve payment to deposit')
    }, 1000);
  }
  setTimeout(function() {
    notificationOff()
  }, 5000);
  
})

document
.querySelector("#newQuestionBtn")
.addEventListener("click", async (e) => {
  $('#cover-spin').show(0)
  e.preventDefault();
  const params = [
    document.getElementById("questionTitle").value,
    [
        document.getElementById("option1").value,
        document.getElementById("option2").value,
        document.getElementById("option3").value,
        document.getElementById("option4").value,

    ],
    document.getElementById("answer").value,
  ]
  notification(`⌛ Adding new Question...`)
  try {
    const result = await contract.methods
      .createQuestion(...params)
      .send({ from: kit.defaultAccount })
      notification(`🎉 Question added successfully".`)
  } catch (error) {
    notification(`⚠️ ${error}.`)
  }
  
  setTimeout(function() {
    notificationOff()
  }, 5000);
  setTimeout(function() {
    $('#cover-spin').hide()
  }, 1500);
})


window.addEventListener('load', async () => { 
    $('#cover-spin').show(0)
    await handleConnectionModal();
});