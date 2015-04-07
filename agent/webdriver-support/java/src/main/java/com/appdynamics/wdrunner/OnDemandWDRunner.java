package com.appdynamics.wdrunner;
/*
 * Copyright (c) AppDynamics Inc
 * All rights reserved
 */

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.remote.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.stringtemplate.v4.ST;

import javax.tools.*;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.sql.Driver;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;

import static javax.tools.Diagnostic.Kind;

/**
 * @author <a mailto="karthik3186@gmail.com">Karthik Krishnamurthy</a>
 * @since 2/15/2015
 */
public class OnDemandWDRunner {
    private static final Logger LOG = LoggerFactory.getLogger(OnDemandWDRunner.class);
    private static final File OUTPUT_DIRECTORY = createOutputDirectory();
    private static final String TEMPLATE_CLASS_NAME = "com.appdynamics.wdrunner.UserWDScript";
    private static final String[] TEMPLATE_SOURCE_CODE_FRAGMENTS = new String[] {
        "",
        "package com.appdynamics.wdrunner;",
        "import org.openqa.selenium.*;",
        "public class UserWDScript {",
        "    public void run(WebDriver driver) throws Exception {",
        "        <script>",
        "    }",
        "}",
        ""
    };
    private static final ST TEMPLATE_SOURCE_CODE = new ST(getTemplateSourceCode());

    public static void run(WebDriver driver, String userWDSnippet) throws Exception {
        if (!compile(TEMPLATE_SOURCE_CODE.add("script", userWDSnippet).render())) {
            throw new RuntimeException("Compilation failed!");
        }

        Class clazz = new URLClassLoader(
            new URL[] {OUTPUT_DIRECTORY.toURI().toURL()}
        ).loadClass(TEMPLATE_CLASS_NAME);

        Object userWDScript = clazz.newInstance();
        Method runMethod = clazz.getDeclaredMethod("run", WebDriver.class);

        LOG.info("Before {}.run", TEMPLATE_CLASS_NAME);
        runMethod.invoke(userWDScript, driver);
        LOG.info("After {}.run", TEMPLATE_CLASS_NAME);
    }

    private static class DynamicDiagnosticListener implements DiagnosticListener<JavaFileObject> {
        @Override
        public void report(Diagnostic<? extends JavaFileObject> diagnostic) {
            Kind kind = diagnostic.getKind();
            if (kind == Kind.ERROR) {
                LOG.error("Compilation failed.");
                LOG.error("Compilation diagnostics: {}" + getDiagnosticString(diagnostic));
            } else {
                LOG.info("Compilation diagnostics: {}" + getDiagnosticString(diagnostic));
            }
        }

        private String getDiagnosticString(Diagnostic<? extends JavaFileObject> diagnostic) {
            String lineSeparator = System.lineSeparator();
            String template = lineSeparator +
                "[%s] At line: %d," + lineSeparator +
                "%s" + lineSeparator +
                "%s" + lineSeparator;

            return String.format(template, diagnostic.getCode(), diagnostic.getLineNumber(),
                diagnostic.getMessage(Locale.ENGLISH), diagnostic.getSource());
        }
    }

    private static class InMemoryJavaFileObject extends SimpleJavaFileObject {
        private String contents;

        public InMemoryJavaFileObject(String className, String contents) {
            super(URI.create("string:///" + className.replace('.', '/') + Kind.SOURCE.extension), Kind.SOURCE);
            this.contents = contents;
        }

        @Override
        public CharSequence getCharContent(boolean ignoreEncodingErrors) {
            return contents;
        }
    }

    private static boolean compile(final String sourceCode) {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        DynamicDiagnosticListener listener = new DynamicDiagnosticListener();
        StandardJavaFileManager fileManager = compiler.getStandardFileManager(listener, Locale.ENGLISH, null);

        List<String> compileOptions = new ArrayList<String>();
        compileOptions.add("-d");
        compileOptions.add(OUTPUT_DIRECTORY.getPath());
        compileOptions.add("-classpath");
        compileOptions.add(System.getProperty("java.class.path"));

        List<JavaFileObject> compilationObjects = new ArrayList<JavaFileObject>() {
            {
                add(new InMemoryJavaFileObject(TEMPLATE_CLASS_NAME, sourceCode));
            }
        };

        LOG.info("Compiling java program: \r\n{}with options: {}", sourceCode, compileOptions.toString());

        JavaCompiler.CompilationTask task = compiler.getTask(null, fileManager, listener, compileOptions, null,
                compilationObjects);

        return task.call();
    }

    private static File createOutputDirectory() {
        String appDataDir = System.getenv("APPDATA");
        String path = "";
        if (appDataDir != null && !appDataDir.isEmpty()) {
            path += appDataDir + "/";
        }
        path += "webdriver-generated";
        // Delete it if it already exists.
        File f = new File(path);
        if (f.exists()) {
            f.delete();
        }
        f.mkdirs();
        return f;
    }

    private static String getTemplateSourceCode() {
        String sourceCode = "";
        for (String line : TEMPLATE_SOURCE_CODE_FRAGMENTS) {
            sourceCode += line + System.lineSeparator();
        }
        return sourceCode;
    }
}
