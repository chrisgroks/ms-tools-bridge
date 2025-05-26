using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestConsoleApp
{
    internal class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, .NET Framework 4.8!");
            
            // Test some basic functionality
            var numbers = new List<int> { 1, 2, 3, 4, 5 };
            var evenNumbers = numbers.Where(n => n % 2 == 0).ToList();
            
            Console.WriteLine($"Even numbers: {string.Join(", ", evenNumbers)}");
            
            // Test async/await (available in .NET Framework 4.5+)
            RunAsync().Wait();
            
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
        
        static async Task RunAsync()
        {
            await Task.Delay(100);
            Console.WriteLine("Async operation completed!");
        }
    }
}