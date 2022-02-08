const { response } = require('express');
const express = require('express');
const req = require('express/lib/request');
const { v4:uuidv4 } = require("uuid")

const app = express();

app.use(express.json());

const customers = [];

function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if(!customer)
    return response.status(400).json({error: "Customer not found"});

  request.customer = customer;

  return next();

}

function getBalance(statement) {
  // array.reduce((acumulador, objeto) => {
  //  função
  //}, valor inicial do acumulador)
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.post('/account', (request, response) => {

  const { cpf, name } = request.body;

  const cpfAlreadyRegistered = customers.some(customer => customer.cpf.toString() === cpf.toString());

  if (cpfAlreadyRegistered) {
    return response.status(400).json({error: "CPF já cadastrado"})
  }

  customers.push({
    id: uuidv4(),
    cpf: cpf.toString(),
    name,
    statement: []
  });

  return response.status(201).send();
});

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {

  const { name } = request.body;

  const customer = request.customer;

  customer.name = name;

  return response.status(201).send();

});

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {

  const customer = request.customer;

  return response.json(customer);
});


app.delete('/account', verifyIfExistsAccountCPF,(request, response) => {

  const customer = request.customer;

  const customerIndex = customers.findIndex(cust => cust.cpf === customer.cpf);

    customers.splice(customerIndex, 1);
  return response.status(204).send();
});

app.get('/account/index',  (_, response) => {
  return response.json(customers);
});

app.get('/balance', verifyIfExistsAccountCPF,  (request, response) => {
  const customer = request.customer;

  const balance = getBalance(customer.statement);

  return response.json(balance);

});



app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {

  const customer = request.customer;

  return response.json(customer.statement);

});

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {

  const customer = request.customer;

  const {date} = request.query;

  const formatedDate = new Date(date + " 00:00");

  const statements = customer.statement.filter(statement =>
    statement.createdAt.toDateString() === new Date(formatedDate).toDateString());

  return response.json(statements);

});

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;

  const customer = request.customer;

  const statementOperation = {
    amount,
    description,
    createdAt: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation)

  return response.status(201).send();

});

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;

  const customer = request.customer;

  const balance = getBalance(customer.statement);

  if(balance < amount) {
    return response.status(400).json({error: "Insuffcient funds!"})
  } else {
    const statementOperation = {
      amount,
      createdAt: new Date(),
      type: "debit"
    }
    customer.statement.push(statementOperation);

    return response.status(201).send();
  }
});

app.listen(3333, () => console.log("Server started on port 3333!"))
