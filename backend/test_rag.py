

from rag_engine import ask_question


print("Enterprise RAG Chatbot Test")
print("Type 'exit' to quit\n")

while True:

    question = input("Ask: ")

    if question.lower() == "exit":
        break

    answer = ask_question(question)

    print("\nAnswer:\n", answer)