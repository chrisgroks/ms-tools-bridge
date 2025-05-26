using System;
using System.Collections.Generic;
using System.Linq;

namespace TestClassLibrary
{
    /// <summary>
    /// A simple calculator class for testing IntelliSense and language features
    /// </summary>
    public class Calculator
    {
        /// <summary>
        /// Adds two numbers
        /// </summary>
        /// <param name="a">First number</param>
        /// <param name="b">Second number</param>
        /// <returns>The sum of a and b</returns>
        public double Add(double a, double b)
        {
            return a + b;
        }

        /// <summary>
        /// Subtracts two numbers
        /// </summary>
        /// <param name="a">First number</param>
        /// <param name="b">Second number</param>
        /// <returns>The difference of a and b</returns>
        public double Subtract(double a, double b)
        {
            return a - b;
        }

        /// <summary>
        /// Multiplies two numbers
        /// </summary>
        /// <param name="a">First number</param>
        /// <param name="b">Second number</param>
        /// <returns>The product of a and b</returns>
        public double Multiply(double a, double b)
        {
            return a * b;
        }

        /// <summary>
        /// Divides two numbers
        /// </summary>
        /// <param name="a">Dividend</param>
        /// <param name="b">Divisor</param>
        /// <returns>The quotient of a divided by b</returns>
        /// <exception cref="DivideByZeroException">Thrown when b is zero</exception>
        public double Divide(double a, double b)
        {
            if (Math.Abs(b) < double.Epsilon)
                throw new DivideByZeroException("Cannot divide by zero");
            
            return a / b;
        }

        /// <summary>
        /// Calculates the average of a collection of numbers
        /// </summary>
        /// <param name="numbers">Collection of numbers</param>
        /// <returns>The average value</returns>
        public double Average(IEnumerable<double> numbers)
        {
            if (numbers == null)
                throw new ArgumentNullException(nameof(numbers));
            
            var list = numbers.ToList();
            if (!list.Any())
                throw new ArgumentException("Collection cannot be empty", nameof(numbers));
            
            return list.Average();
        }

        /// <summary>
        /// Calculates the factorial of a number
        /// </summary>
        /// <param name="n">The number</param>
        /// <returns>The factorial of n</returns>
        public long Factorial(int n)
        {
            if (n < 0)
                throw new ArgumentException("Factorial is not defined for negative numbers");
            
            if (n == 0 || n == 1)
                return 1;
            
            long result = 1;
            for (int i = 2; i <= n; i++)
            {
                result *= i;
            }
            
            return result;
        }
    }
}