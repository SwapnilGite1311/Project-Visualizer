using System;
using Acme.Util;

namespace Acme.App
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var helper = new Helper();
            Console.WriteLine(helper.Greet("world"));
            Run();
        }

        private static void Run()
        {
            if (DateTime.Now.Hour > 12)
            {
                Console.WriteLine("afternoon");
            }
        }
    }
}
