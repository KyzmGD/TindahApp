
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_NAME = 'tindahapp-backend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    bat 'npm ci --no-audit --no-fund'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('backend') {
                    bat 'npm test -- --forceExit'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {
                        withCredentials([
                            string(
                                credentialsId: 'Test1-token',
                                variable: 'SONAR_TOKEN'
                            )
                        ]) {
                            bat """
                                "${scannerHome}\\bin\\sonar-scanner.bat" ^
                                -Dsonar.token=%SONAR_TOKEN%
                            """
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker version'
                bat 'docker build -t tindahapp-backend:%BUILD_NUMBER% -f backend/Dockerfile backend'
                bat 'docker tag tindahapp-backend:%BUILD_NUMBER% tindahapp-backend:latest'
            }
        }
    }

    post {
        success {
            echo 'Tests, SonarQube Quality Gate, and Docker build completed.'
        }
        failure {
            echo 'Pipeline failed. Check the failed stage in the console log.'
        }
    }
}
