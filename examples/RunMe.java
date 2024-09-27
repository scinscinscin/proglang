import java.util.*;

class RunMe {
	public static void main(String[] args) {
		Scanner scanner = new Scanner(System.in);
		
		System.out.print("Enter your first name: ");
		String input = scanner.nextLine();

		System.out.printf("Enter your age: ");
		int number = scanner.nextInt();
		
		System.out.printf("Hello, %s!. You are %d years old.\n", input, number);
		System.out.println("Have a good day!");
	}
}
